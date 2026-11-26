from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import httpx
import re
import time
import sys
from pathlib import Path
from dotenv import load_dotenv

# The service is started both from python_service and from src. Make the
# directory containing the `ai` package importable in both cases.
SRC_DIR = Path(__file__).resolve().parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

# Import logic from other files
from ai.services.planner_service import PlannerService
from ai.schemas.trip_plan_schema import (
    TripRecommendationRequest,
    LocationRankingRequest,
    OrganizePlanRequest,
    HybridSearchRequest,
    HybridSearchResponse
)

class EmbedTextRequest(BaseModel):
    text: str

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

OPEN_WEATHER_KEY = os.getenv('OPEN_WEATHER_KEY')

app = FastAPI(title="PlanTravel AI & Weather Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Initialize services independently so search/cache failures do not disable planner routes.
try:
    planner_service = PlannerService()
except Exception as e:
    print(f"Warning: Planner service initialization failed: {e}")
    planner_service = None

# Semantic search downloads the large BAAI/bge-m3 model during startup.
# Keep it opt-in so the Gemini planner can start without a multi-GB model download.
search_service = None
if os.getenv("ENABLE_SEMANTIC_SEARCH", "false").strip().lower() in {"1", "true", "yes", "on"}:
    try:
        # Import the optional ML stack only when semantic search is enabled.
        from ai.services.search_service import SearchService
        search_service = SearchService()
    except Exception as e:
        print(f"Warning: Search service initialization failed: {e}")

ai_cooldown_until = {
    "rank": 0.0,
    "organize": 0.0,
}


def _quota_retry_seconds(error: Exception) -> int:
    text = str(error)
    if "RESOURCE_EXHAUSTED" not in text and "429" not in text:
        return 0

    retry_match = re.search(r"retryDelay': '(\d+)s", text)
    if not retry_match:
        retry_match = re.search(r"Please retry in ([\d.]+)s", text)

    if retry_match:
        try:
            return max(15, min(300, int(float(retry_match.group(1))) + 5))
        except Exception:
            return 60

    return 60


def _ai_cooldown_active(task: str) -> bool:
    return time.time() < ai_cooldown_until.get(task, 0.0)


def _remember_ai_quota(task: str, error: Exception) -> bool:
    retry_seconds = _quota_retry_seconds(error)
    if not retry_seconds:
        return False

    ai_cooldown_until[task] = time.time() + retry_seconds
    print(f"Warning: Gemini quota exhausted for {task}; using fallback for ~{retry_seconds}s.")
    return True


def fallback_rank_locations(request: LocationRankingRequest):
    preferences = [str(p or "").strip().lower() for p in (request.preferences or []) if str(p or "").strip()]
    budget = int(request.budget or 0)
    days = max(int(request.days or 1), 1)
    rankings = []

    for loc in request.locations:
        category = (loc.category or "").lower()
        name = (loc.name or "").lower()
        cost = int(loc.estimatedCost or 0)
        score = 5.0
        matched = []

        for pref in preferences:
            if pref and (pref in category or pref in name or category in pref):
                score += 1.5
                matched.append(pref)

        if budget and cost:
            daily_budget = budget / days
            if cost <= daily_budget * 0.2:
                score += 1.0
            elif cost > daily_budget * 0.5:
                score -= 1.0

        if loc.latitude is not None and loc.longitude is not None:
            score += 0.5

        reason = "Phu hop voi khu vuc va du lieu dia diem hien co."
        if matched:
            reason = f"Khop so thich: {', '.join(matched[:3])}."

        rankings.append({
            "name": loc.name,
            "id": loc.id,
            "score": max(1, min(10, round(score))),
            "reason": reason
        })

    rankings.sort(key=lambda item: item["score"], reverse=True)
    return {"rankings": rankings}


def fallback_organize_plan(request: OrganizePlanRequest):
    days_count = max(int(request.days or 1), 1)
    locations = list(request.locations or [])
    if not locations:
        return {
            "planName": f"Ke hoach {request.region}",
            "description": "Chưa tìm thấy địa điểm thực có trong dữ liệu; không tạo điểm dừng giả. Hãy thử khu vực khác hoặc bổ sung dữ liệu địa điểm.",
            "generationMethod": "rule-based",
            "transport": "Chưa thể đề xuất phương tiện khi chưa có địa điểm.",
            "accommodation": "Chưa thể đề xuất nơi lưu trú khi chưa có địa điểm.",
            "costAllocation": {"transport": None, "accommodation": None, "meals": None, "attractions": None, "contingency": None},
            "costBreakdown": [],
            "risks": ["Chưa có giá xác thực; cần kiểm tra trực tiếp với nhà cung cấp."],
            "weather": "Chưa có dự báo xác thực cho ngày đi.",
            "days": [{"dayNumber": index + 1, "title": f"Ngày {index + 1}", "items": []} for index in range(days_count)]
        }

    focus_id = str(request.focusLocationId) if request.focusLocationId else None
    if focus_id:
        locations.sort(key=lambda loc: 0 if str(loc.id) == focus_id else 1)

    max_items = min(len(locations), max(days_count * 5, days_count))
    selected = locations[:max_items]
    items_per_day = max(1, (len(selected) + days_count - 1) // days_count)
    days = []

    for day_index in range(days_count):
        start = day_index * items_per_day
        day_locations = selected[start:start + items_per_day]
        if not day_locations:
            days.append({"dayNumber": day_index + 1, "title": f"Ngày {day_index + 1}", "items": []})
            continue

        day_items = []
        for item_index, loc in enumerate(day_locations[:5]):
            start_hour = min(8 + item_index * 2, 20)
            end_hour = min(start_hour + 1, 22)
            category = loc.category or "dia diem"
            cost = int(loc.estimatedCost) if loc.estimatedCost is not None else None
            note = f"Tham quan {category}."
            if cost is not None:
                note += f" Chi phi du kien khoang {cost} VND."

            day_items.append({
                "locationId": str(loc.id) if loc.id is not None else None,
                "locationName": loc.name,
                "startTime": f"{start_hour:02d}:00",
                "endTime": f"{end_hour:02d}:00",
                "note": note,
                "travelMinutesToNext": 20 if item_index < len(day_locations[:5]) - 1 else 0
            })

        days.append({
            "dayNumber": day_index + 1,
            "title": f"Ngay {day_index + 1}",
            "items": day_items
        })

    return {
        "planName": f"Ke hoach {request.region} {days_count} ngay",
        "description": "Lich trinh fallback duoc tao khi AI tam thoi khong kha dung.",
        "generationMethod": "rule-based",
        "transport": "Phương tiện đề xuất: xe máy hoặc ô tô tùy khoảng cách giữa các điểm." if request.transportMode in ('auto', 'other') else f"Phương tiện theo lựa chọn: {request.transportMode}.",
        "accommodation": "Nên nghỉ tại khách sạn gần khu vực trung tâm; dành ít nhất 8 giờ nghỉ mỗi đêm." if days_count > 1 else "Không cần lưu trú qua đêm cho chuyến đi trong ngày.",
        "costAllocation": {"transport": None, "accommodation": None, "meals": None, "attractions": None, "contingency": None},
        "costBreakdown": [],
        "risks": ["Lịch trình dự phòng khi Gemini không khả dụng; xác nhận giờ mở cửa, thời gian đi lại và giá trước chuyến đi."],
        "weather": "Chưa có dự báo xác thực cho ngày đi.",
        "days": days
    }

@app.on_event("startup")
async def startup_event():
    if search_service:
        search_service.refresh_cache()

class WeatherResponse(BaseModel):
    temp: str
    condition: str
    rain_mm: float
    city: str

@app.get("/")
async def health_check():
    return {"message": "PlanTravel AI & Weather Service is running"}

@app.get("/health")
async def health_probe():
    return {"status": "ok", "service": "plantravel-python-ai"}

@app.get('/api/weather', response_model=WeatherResponse)
async def get_weather(lat: float, lon: float):
    if not OPEN_WEATHER_KEY:
        raise HTTPException(status_code=500, detail='OPEN_WEATHER_KEY missing')
        
    if not (8.179 <= lat <= 23.393 and 102.144 <= lon <= 109.464):
        raise HTTPException(status_code=400, detail='Chỉ hỗ trợ vị trí trong lãnh thổ Việt Nam.')

    url = (
        'https://api.openweathermap.org/data/2.5/weather'
        f'?lat={lat}&lon={lon}&appid={OPEN_WEATHER_KEY}&units=metric&lang=vi'
    )

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f'Lỗi kết nối OpenWeatherMap: {e}')
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)

    rain_mm = (data.get('rain') or {}).get('1h', 0.0)
    return WeatherResponse(
        temp=f"{data['main']['temp']}°C",
        condition=data['weather'][0]['description'],
        rain_mm=rain_mm,
        city=data.get('name', 'Không rõ')
    )

@app.post("/ai/generate-plan")
async def generate_plan(request: TripRecommendationRequest):
    if not planner_service:
        raise HTTPException(status_code=503, detail="AI Service is not configured")
    
    try:
        result = planner_service.generate_trip_plans(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/rank-locations")
async def rank_locations(request: LocationRankingRequest):
    if not planner_service:
        return fallback_rank_locations(request)
    if _ai_cooldown_active("rank"):
        return fallback_rank_locations(request)
    try:
        return planner_service.rank_locations(request)
    except Exception as e:
        if not _remember_ai_quota("rank", e):
            print(f"Warning: AI rank-locations failed, using fallback: {type(e).__name__}: {str(e)[:180]}")
        return fallback_rank_locations(request)

@app.post("/ai/organize-plan")
async def organize_plan(request: OrganizePlanRequest):
    # Only server-fetched observations may be given to the model as verified weather.
    request.weatherContext = None
    point = next((place for place in request.locations if place.latitude is not None and place.longitude is not None), None)
    if point and OPEN_WEATHER_KEY:
        try:
            import asyncio
            observation = await asyncio.wait_for(get_weather(point.latitude, point.longitude), timeout=4)
            from datetime import datetime, timezone
            request.weatherContext = (
                f"Quan trắc hiện tại tại {observation.city}, {datetime.now(timezone.utc).isoformat()}: "
                f"{observation.condition}, {observation.temp}, mưa {observation.rain_mm} mm trong giờ qua. "
                "Chưa có dự báo xác thực cho ngày khởi hành."
            )
        except Exception:
            pass  # Weather outages must not prevent planning.
    if not planner_service:
        return fallback_organize_plan(request)
    if _ai_cooldown_active("organize"):
        return fallback_organize_plan(request)
    try:
        return planner_service.organize_plan(request)
    except Exception as e:
        if not _remember_ai_quota("organize", e):
            print(f"Warning: AI organize-plan failed, using fallback: {type(e).__name__}: {str(e)[:180]}")
        return fallback_organize_plan(request)

@app.post("/ai/hybrid-search", response_model=HybridSearchResponse)
async def hybrid_search(request: HybridSearchRequest):
    if not search_service:
        raise HTTPException(status_code=503, detail="Search Service is not configured")
    try:
        results = search_service.search(
            request.query,
            request.limit or 10,
            request.region,
            request.category
        )
        return {"results": results}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/ai/embed-text")
async def embed_text(request: EmbedTextRequest):
    if not search_service:
        raise HTTPException(status_code=503, detail="Search Service is not configured")
    try:
        embedding = search_service.embed_text(request.text)
        return {"embedding": embedding or []}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/ai/refresh-search-cache")
async def refresh_search_cache():
    if not search_service:
        raise HTTPException(status_code=503, detail="Search Service is not configured")
    try:
        search_service.refresh_cache()
        return {"message": "Search cache refreshed successfully"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
