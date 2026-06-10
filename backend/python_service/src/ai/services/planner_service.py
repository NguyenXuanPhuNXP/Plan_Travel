import json
import re
from google import genai
from google.genai import types
from pydantic import ValidationError

from ai.config.ai_settings import GEMINI_API_KEY, GEMINI_MODEL
from ai.schemas.trip_plan_schema import (
    TripRecommendationRequest,
    TripPlanResponse,
    LocationRankingRequest,
    LocationRankingResponse,
    OrganizePlanRequest,
    OrganizedTripPlan,
)
from ai.services.prompt_builder import build_messages
from ai.services.retrieval_service import (
    retrieve_locations,
    build_context_from_locations,
)


def _strip_code_fence(raw_text: str) -> str:
    text = (raw_text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _normalize_hhmm(value: str, fallback: str) -> str:
    if value is None:
        return fallback
    s = str(value).strip()
    if not s:
        return fallback

    m = re.match(r"^(\d{1,2}):(\d{1,2})$", s)
    if not m:
        m = re.match(r"^(\d{1,2})h(\d{1,2})?$", s, flags=re.IGNORECASE)

    if m:
        hh = int(m.group(1))
        mm = int(m.group(2) or 0)
        hh = min(max(hh, 0), 23)
        mm = min(max(mm, 0), 59)
        return f"{hh:02d}:{mm:02d}"

    return fallback


def _normalize_organized_plan_payload(parsed: dict) -> dict:
    if not isinstance(parsed, dict):
        return {"planName": "Kế hoạch chuyến đi", "description": "", "days": []}

    plan_name = str(parsed.get("planName") or "Kế hoạch chuyến đi")
    description = str(parsed.get("description") or "")
    days_raw = parsed.get("days")
    if not isinstance(days_raw, list):
        days_raw = []

    days = []
    for day_idx, day in enumerate(days_raw, start=1):
        if not isinstance(day, dict):
            day = {}

        day_number = day.get("dayNumber")
        try:
            day_number = int(day_number)
        except Exception:
            day_number = day_idx

        title = str(day.get("title") or f"Ngày {day_number}")

        items_raw = day.get("items")
        if not isinstance(items_raw, list):
            items_raw = []

        items = []
        for item_idx, item in enumerate(items_raw):
            if not isinstance(item, dict):
                item = {}

            default_start_hour = min(7 + item_idx * 2, 21)
            default_end_hour = min(default_start_hour + 1, 22)

            location_id = item.get("locationId")
            location_id = str(location_id) if location_id not in (None, "") else None

            location_name = str(
                item.get("locationName")
                or item.get("name")
                or "Điểm dừng"
            )

            start_time = _normalize_hhmm(item.get("startTime"), f"{default_start_hour:02d}:00")
            end_time = _normalize_hhmm(item.get("endTime"), f"{default_end_hour:02d}:00")
            note = str(item.get("note") or "")

            travel_minutes = item.get("travelMinutesToNext", 15)
            try:
                travel_minutes = int(travel_minutes)
            except Exception:
                travel_minutes = 15
            travel_minutes = max(0, travel_minutes)

            items.append({
                "locationId": location_id,
                "locationName": location_name,
                "startTime": start_time,
                "endTime": end_time,
                "note": note,
                "travelMinutesToNext": travel_minutes
            })

        days.append({
            "dayNumber": day_number,
            "title": title,
            "items": items
        })

    return {
        "planName": plan_name,
        "description": description,
        "days": days
    }


class PlannerService:
    def __init__(self):
        if not GEMINI_API_KEY:
            raise ValueError("Thiếu GEMINI_API_KEY trong Database/.env")

        self.client = genai.Client(api_key=GEMINI_API_KEY)

    def generate_trip_plans(
        self, request: TripRecommendationRequest
    ) -> TripPlanResponse:
        locations = retrieve_locations(
            destination_type=request.destinationType,
            place_types=request.placeTypes,
            region=request.region,
            budget=request.budget,
        )

        context_text = build_context_from_locations(locations)

        messages = build_messages(
            destination_type=request.destinationType,
            place_types=request.placeTypes,
            region=request.region,
            weather=request.weather,
            budget=request.budget,
            retrieved_context=context_text,
        )

        prompt_text = "\n\n".join([m["content"] for m in messages])
        prompt_text += (
            "\n\nBẮT BUỘC:"
            "\n- Chỉ trả về JSON hợp lệ"
            "\n- Không markdown"
            "\n- Không thêm giải thích ngoài JSON"
        )

        response = self.client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt_text,
            config=types.GenerateContentConfig(
                temperature=0.4,
                top_p=0.9,
                max_output_tokens=8192,
                response_mime_type="application/json",
                response_schema=TripPlanResponse,
            ),
        )

        raw_text = _strip_code_fence(response.text)

        try:
            parsed = json.loads(raw_text)
            return TripPlanResponse.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ValueError(f"Lỗi xử lý output từ Gemini: {str(exc)}")

    def rank_locations(self, request: LocationRankingRequest) -> LocationRankingResponse:
        location_list = "\n".join([
            f"- {l.name} (ID: {l.id}, category: {l.category or 'general'}, cost: ~{l.estimatedCost or 0}đ)"
            for l in request.locations
        ])

        prompt = (
            f"Bạn là chuyên gia du lịch Việt Nam. Đánh giá và xếp hạng các địa điểm sau cho chuyến đi {request.region}"
            f"{f' {request.days} ngày' if request.days else ''}"
            f"{f', ngân sách {request.budget}đ' if request.budget else ''}"
            f"{f', sở thích: {', '.join(request.preferences)}' if request.preferences else ''}.\n\n"
            f"Danh sách địa điểm:\n{location_list}\n\n"
            "BẮT BUỘC trả về JSON array theo định dạng: {\"rankings\": [{\"name\": \"tên\", \"id\": \"ID từ input\", \"score\": 1-10, \"reason\": \"lý do\"}]}"
        )

        response = self.client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=LocationRankingResponse,
            ),
        )

        try:
            parsed = json.loads(_strip_code_fence(response.text))
            return LocationRankingResponse.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ValueError(f"Lỗi xếp hạng địa điểm: {str(exc)}")

    def organize_plan(self, request: OrganizePlanRequest) -> OrganizedTripPlan:
        location_list = "\n".join([
            f"- {l.name} (ID: {l.id}, {l.category or 'general'}, lat: {l.latitude}, lng: {l.longitude}, cost: {l.estimatedCost or 0}đ, duration: {l.suggestedDuration or '1-2h'})"
            for l in request.locations
        ])

        budget_str = f"{request.budget:,}" if request.budget else "Không giới hạn"

        focus_info = ""
        if request.focusLocationId:
            focus_loc = next((l for l in request.locations if str(l.id) == str(request.focusLocationId)), None)
            if focus_loc:
                focus_info = f"\n- ĐỊA ĐIỂM CHỦ ĐẠO: {focus_loc.name}. Hãy xây dựng lịch trình xoay quanh địa điểm này, ưu tiên tham quan nó vào thời điểm đẹp nhất hoặc dành nhiều thời gian hơn."

        prompt = (
            "Bạn là chuyên gia du lịch Việt Nam. Hãy tạo lịch trình du lịch chi tiết (có tính đến chi phí và thời gian di chuyển).\n\n"
            f"Thông tin:\n- Địa điểm: {request.region}\n- Số ngày: {request.days}\n"
            f"- Ngân sách: {budget_str} VNĐ\n"
            f"- Sở thích: {', '.join(request.preferences) if request.preferences else 'Đa dạng'}"
            f"{focus_info}\n\n"
            f"Danh sách địa điểm có sẵn (bao gồm cả quán ăn, khách sạn và điểm tham quan):\n{location_list}\n\n"
            "YÊU CẦU LỊCH TRÌNH:\n"
            "1. ĂN UỐNG: Mỗi ngày phải bao gồm ít nhất 3 bữa (Sáng, Trưa, Tối). Hãy chọn các quán ăn/nhà hàng từ danh sách nếu có, hoặc gợi ý tên quán phù hợp nếu không có trong danh sách.\n"
            "2. ĐI LẠI: Mô tả phương tiện di chuyển hợp lý giữa các điểm (ví dụ: đi bộ, taxi, xe máy) trong trường 'note'.\n"
            "3. LƯU TRÚ: Nếu đi trên 1 ngày, hãy bao gồm hoạt động 'Check-in khách sạn' vào chiều ngày 1 và 'Nghỉ ngơi tại khách sạn' vào cuối mỗi ngày.\n"
            "4. SỐ LƯỢNG: Mỗi ngày chỉ được chọn tối đa 6 địa điểm/hoạt động thực sự chất lượng từ danh sách. Đừng cố dùng hết danh sách đầu vào.\n"
            "5. THỜI GIAN: BẮT BUỘC định dạng HH:mm (ví dụ: 08:30, 14:00). Tuyệt đối không để trống hoặc để --:--. Sắp xếp thời gian tăng dần từ 07:00 đến 22:00.\n"
            "6. ĐỊNH DẠNG: Trả về JSON chi tiết. BẮT BUỘC trường 'locationId' khớp với ID trong danh sách nếu địa điểm đó có trong danh sách.\n\n"
            "Lưu ý: Nếu budget nhỏ, ưu tiên các địa điểm miễn phí, quán ăn bình dân. Nếu budget lớn, ưu tiên nhà hàng và khách sạn cao cấp."
        )

        response = self.client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
                response_schema=OrganizedTripPlan,
            ),
        )

        raw_text = _strip_code_fence(response.text)
        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Lỗi tổ chức lịch trình (JSON decode): {str(exc)} | raw={raw_text[:500]}")

        normalized = _normalize_organized_plan_payload(parsed)

        try:
            return OrganizedTripPlan.model_validate(normalized)
        except ValidationError as exc:
            raise ValueError(f"Lỗi tổ chức lịch trình (schema validate): {str(exc)} | normalized={json.dumps(normalized, ensure_ascii=False)[:800]}")


# python m uvicorn src.Recommendation:app --reload --port 8000
