import json
import re
from typing import Optional
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


def _format_price(value: Optional[int]) -> str:
    return f"{value:,}đ" if value is not None else "chưa có dữ liệu giá"


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


def _normalize_organized_plan_payload(parsed: dict, max_items_per_day: int = 6) -> dict:
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
        # The backend scheduler applies the activity limit after mapping locations.
        # Keep overnight stays here because they are not part of that limit.
        items_raw = items_raw[:40]

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
        "generationMethod": str(parsed.get("generationMethod") or "ai"),
        "planName": plan_name,
        "description": description,
        "recommendedStopsPerDay": parsed.get("recommendedStopsPerDay"),
        "days": days,
        **{key: parsed[key] for key in ('transport', 'accommodation', 'costAllocation', 'costBreakdown', 'risks', 'weather') if key in parsed}
    }


class PlannerService:
    def __init__(self):
        if not GEMINI_API_KEY:
            raise ValueError("Thiếu GEMINI_API_KEY trong file .env")

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
        preferences_text = ", ".join(request.preferences or [])
        location_list = "\n".join([
            f"- {l.name} (ID: {l.id}, category: {l.category or 'general'}, cost: {_format_price(l.estimatedCost)})"
            for l in request.locations
        ])

        prompt = (
            f"Bạn là chuyên gia du lịch Việt Nam. Đánh giá và xếp hạng các địa điểm sau cho chuyến đi {request.region}"
            f"{f' {request.days} ngày' if request.days else ''}"
            f"{f', ngân sách {request.budget}đ' if request.budget else ''}"
            f"{f', sở thích: {preferences_text}' if preferences_text else ''}.\n\n"
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
        max_stops = request.maxStopsPerDay if isinstance(request.maxStopsPerDay, int) else 8
        max_stops = max(1, min(max_stops, 20))
        location_list = "\n".join([
            f"- {l.name} (ID: {l.id}, {l.category or 'general'}, lat: {l.latitude}, lng: {l.longitude}, cost: {_format_price(l.estimatedCost)}, duration: {l.suggestedDuration or '1-2h'}, giờ mở cửa: {l.openingHours or 'chưa biết'})"
            for l in request.locations
        ])

        budget_str = f"{request.budget:,}" if request.budget is not None else "Chưa cung cấp, hãy ước tính và nêu rõ giả định"

        focus_info = ""
        if request.focusLocationId:
            focus_loc = next((l for l in request.locations if str(l.id) == str(request.focusLocationId)), None)
            if focus_loc:
                focus_info = f"\n- ĐỊA ĐIỂM CHỦ ĐẠO: {focus_loc.name}. Hãy xây dựng lịch trình xoay quanh địa điểm này, ưu tiên tham quan nó vào thời điểm đẹp nhất hoặc dành nhiều thời gian hơn."

        prompt = (
            "Bạn là chuyên gia du lịch Việt Nam. Hãy tạo lịch trình du lịch chi tiết (có tính đến chi phí và thời gian di chuyển).\n\n"
            f"Thông tin:\n- Địa điểm: {request.region}\n- Số ngày: {request.days}\n"
            f"- Ngân sách: {budget_str} VNĐ\n"
            f"- Đây là TỔNG ngân sách cho {request.travelerCount} người trong TOÀN BỘ chuyến đi, không phải mỗi người hay mỗi ngày.\n"
            f"- Ngày đi: {request.startDate or 'Chưa chọn'}, ngày về: {request.endDate or 'Chưa chọn'}; phương tiện ưu tiên: {request.transportMode}.\n"
            f"- Giờ khởi hành: {request.departureTime}; số hoạt động/điểm dừng tối đa mỗi ngày theo mong muốn người dùng: {max_stops}.\n"
            f"- Thông tin thời tiết từ hệ thống: {request.weatherContext or 'Chưa có dữ liệu xác thực'}. Đây là quan trắc hiện tại, KHÔNG phải dự báo cho ngày đi.\n"
            "- Trả lời tiếng Việt. transport: đề xuất phương tiện và cách đi giữa các điểm. Nếu phương tiện là 'auto' hoặc chưa chọn, bắt buộc chọn phương tiện phù hợp dựa trên khoảng cách, địa hình và thời gian; ghi rõ 'Phương tiện đề xuất: ...'. Không bịa tuyến bay.\n"
            "- accommodation: đề xuất khu vực, loại lưu trú, số đêm và số phòng phù hợp số người; giá chỉ là ước tính, không khẳng định còn phòng.\n"
            "- costAllocation: 5 khoản transport, accommodation, meals, attractions, contingency bằng VNĐ cho CẢ NHÓM. costBreakdown: liệt kê từng khoản có cơ sở; costType PERSON = đơn giá nhân quantity (mặc định 1) nhân số người, GROUP = đơn giá nhân quantity (mặc định 1), hoặc nhân ceil(số người/capacity) nếu chi phí tính theo phương tiện có sức chứa, ROOM = đơn giá/phòng/đêm nhân ceil(số người/capacity) nhân số đêm, FIXED = phí cố định nhân quantity (mặc định 1). Với ROOM, ghi capacity và nights; không tự đoán sức chứa. Ghi dayNumber nếu xác định được ngày phát sinh và locationId nếu khoản tham quan gắn với một địa điểm cụ thể. Tổng costAllocation phải khớp tổng các dòng, không cộng trùng. Nếu thiếu giá/sức chứa, dùng null và ghi rõ khoản chưa xác định; không dùng 0 để giả vờ miễn phí, không bịa giá để ép vừa ngân sách. Các giá AI đề xuất phải đánh dấu isEstimated=true. Nếu ngân sách không khả thi, nói rõ trong description và gợi ý giảm ngày/dịch vụ.\n"
            "- risks: các rủi ro cụ thể và phương án thay thế. weather: nếu có quan trắc từ hệ thống thì tóm tắt và ghi thời điểm quan trắc; luôn ghi rõ chưa có dự báo xác thực cho ngày đi, chỉ nêu lưu ý mùa và phương án mưa, không bịa nhiệt độ hay dự báo.\n"
            f"- Sở thích: {', '.join(request.preferences) if request.preferences else 'Đa dạng'}"
            f"{focus_info}\n\n"
            f"Danh sách địa điểm có sẵn (bao gồm cả quán ăn, khách sạn và điểm tham quan):\n{location_list}\n\n"
            "YÊU CẦU LỊCH TRÌNH:\n"
            "1. ĂN UỐNG: Bảo đảm người dùng có phương án cho 3 bữa Sáng, Trưa, Tối; nếu giới hạn điểm dừng nhỏ hơn 3 thì gộp thông tin bữa ăn vào ghi chú thay vì tạo thêm hoạt động vượt giới hạn. Hãy chọn các quán ăn/nhà hàng từ danh sách nếu có, hoặc gợi ý tên quán phù hợp nếu không có trong danh sách.\n"
            "2. ĐI LẠI: Mô tả phương tiện di chuyển hợp lý giữa các điểm (ví dụ: đi bộ, taxi, xe máy) trong trường 'note'.\n"
            "3. LƯU TRÚ: Nếu đi trên 1 ngày, hãy bao gồm hoạt động 'Check-in khách sạn' vào chiều ngày 1 và 'Nghỉ ngơi tại khách sạn' vào cuối mỗi ngày.\n"
            f"4. SỐ LƯỢNG: Mỗi ngày tối đa {max_stops} điểm hoạt động, bao gồm quán ăn/nhà hàng; KHÔNG tính khách sạn, check-in, lưu trú hoặc nghỉ đêm vào giới hạn. Hãy thêm trường recommendedStopsPerDay là số điểm thực tế nên xếp mỗi ngày dựa trên thời lượng, thời gian di chuyển và giờ mở cửa (không vượt {max_stops}). Không nhồi kín lịch và không cố dùng hết danh sách đầu vào.\n"
            "5. THỜI GIAN: BẮT BUỘC định dạng HH:mm. Mỗi hoạt động nên kéo dài 60-90 phút, chừa 15-30 phút di chuyển; kết thúc hoạt động cuối cùng không muộn hơn 21:30. Nếu không đủ thời gian, bỏ bớt điểm ít ưu tiên thay vì xếp chồng lịch.\n"
            "6. GIỜ MỞ CỬA: Nếu danh sách có giờ mở cửa, tuyệt đối không xếp thời gian bắt đầu/kết thúc ngoài khung đó; phải chừa đủ thời gian tham quan trước giờ đóng cửa. Nếu giờ mở cửa là 'chưa biết', ưu tiên xếp điểm tham quan vào ban ngày và không xếp các địa điểm như bảo tàng, nhà lưu niệm, di tích sau 17:00.\n"
            "7. NGÀY ĐẦU: Thứ tự các địa điểm người dùng đã chọn trong danh sách đầu vào là thứ tự ưu tiên của người dùng; hãy giữ thứ tự đó cho các hoạt động được xếp vào Ngày 1, không tự ý đổi sang thứ tự AI gợi ý. Chỉ điều chỉnh giờ bắt đầu, thời lượng hoặc bỏ bớt điểm khi cần để tránh chồng lịch, giờ đóng cửa hoặc di chuyển không khả thi. Ngày 1 bắt đầu hoạt động tại thời điểm đến địa điểm đầu tiên sau khi tính thời gian di chuyển từ vị trí khởi hành.\n"
            "8. ĐỊNH DẠNG: Trả về JSON chi tiết. BẮT BUỘC trường 'locationId' khớp với ID trong danh sách nếu địa điểm đó có trong danh sách.\n\n"
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

        normalized = _normalize_organized_plan_payload(parsed, max_items_per_day=max_stops)

        try:
            return OrganizedTripPlan.model_validate(normalized)
        except ValidationError as exc:
            raise ValueError(f"Lỗi tổ chức lịch trình (schema validate): {str(exc)} | normalized={json.dumps(normalized, ensure_ascii=False)[:800]}")


# python m uvicorn src.Recommendation:app --reload --port 8000
