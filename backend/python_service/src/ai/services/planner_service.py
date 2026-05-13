import json
from google import genai
from google.genai import types
from pydantic import ValidationError

from src.ai.config.ai_settings import GEMINI_API_KEY, GEMINI_MODEL
from src.ai.schemas.trip_plan_schema import (
    TripRecommendationRequest,
    TripPlanResponse,
    LocationRankingRequest,
    LocationRankingResponse,
    OrganizePlanRequest,
    OrganizedTripPlan,
)
from src.ai.services.prompt_builder import build_messages
from src.ai.services.retrieval_service import (
    retrieve_locations,
    build_context_from_locations,
)


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

        raw_text = (response.text or "").strip()

        if raw_text.startswith("```"):
            raw_text = raw_text.replace("```json", "").replace("```", "").strip()

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
            parsed = json.loads(response.text)
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

        try:
            parsed = json.loads(response.text)
            return OrganizedTripPlan.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ValueError(f"Lỗi tổ chức lịch trình: {str(exc)}")


# python m uvicorn src.Recommendation:app --reload --port 8000