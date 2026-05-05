import json
from google import genai
from google.genai import types
from pydantic import ValidationError

from src.ai.config.ai_settings import GEMINI_API_KEY, GEMINI_MODEL
from src.ai.schemas.trip_plan_schema import (
    TripRecommendationRequest,
    TripPlanResponse,
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
        except json.JSONDecodeError as exc:
            raise ValueError(f"Gemini trả JSON lỗi: {raw_text}") from exc

        try:
            return TripPlanResponse.model_validate(parsed)
        except ValidationError as exc:
            raise ValueError(f"Output không đúng schema: {parsed}") from exc

# python m uvicorn src.Recommendation:app --reload --port 8000