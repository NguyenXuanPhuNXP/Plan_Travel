from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import re
import time

from ai.schemas.trip_plan_schema import (
    TripRecommendationRequest, 
    TripPlanResponse,
    LocationRankingRequest,
    LocationRankingResponse,
    OrganizePlanRequest,
    OrganizedTripPlan,
    HybridSearchRequest,
    HybridSearchResponse
)
from ai.services.planner_service import PlannerService
from ai.services.search_service import SearchService

app = FastAPI(title="AI Recommendation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    planner_service = PlannerService()
except Exception as e:
    print(f"Warning: Planner service initialization failed: {e}")
    planner_service = None

try:
    search_service = SearchService()
except Exception as e:
    print(f"Warning: Search service initialization failed: {e}")
    search_service = None

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
            "description": "Lich trinh duoc tao tu du lieu hien co.",
            "days": [
                {
                    "dayNumber": 1,
                    "title": "Ngay 1",
                    "items": [
                        {
                            "locationId": None,
                            "locationName": request.region,
                            "startTime": "08:00",
                            "endTime": "10:00",
                            "note": "Kham pha khu vuc trung tam va dieu chinh lich trinh theo thuc te.",
                            "travelMinutesToNext": 15
                        }
                    ]
                }
            ]
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
        if not day_locations and selected:
            day_locations = [selected[-1]]

        day_items = []
        for item_index, loc in enumerate(day_locations[:5]):
            start_hour = min(8 + item_index * 2, 20)
            end_hour = min(start_hour + 1, 22)
            category = loc.category or "dia diem"
            cost = int(loc.estimatedCost or 0)
            note = f"Tham quan {category}."
            if cost:
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
        "days": days
    }

@app.on_event("startup")
async def startup_event():
    # Load embeddings on startup
    if not search_service:
        return
    try:
        search_service.refresh_cache()
    except Exception as e:
        print(f"Warning: Could not load search cache: {e}")


@app.get("/")
def health_check():
    return {"message": "AI Recommendation Service is running"}


@app.post("/ai/generate-plan", response_model=TripPlanResponse)
async def generate_plan(request: TripRecommendationRequest):
    if not planner_service:
        raise HTTPException(status_code=503, detail="AI Service is not configured")
    try:
        return planner_service.generate_trip_plans(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/ai/rank-locations", response_model=LocationRankingResponse)
async def rank_locations(request: LocationRankingRequest):
    if not planner_service:
        return fallback_rank_locations(request)
    if _ai_cooldown_active("rank"):
        return fallback_rank_locations(request)
    try:
        return planner_service.rank_locations(request)
    except Exception as exc:
        if not _remember_ai_quota("rank", exc):
            print(f"Warning: AI rank-locations failed, using fallback: {type(exc).__name__}: {str(exc)[:180]}")
        return fallback_rank_locations(request)

@app.post("/ai/organize-plan", response_model=OrganizedTripPlan)
async def organize_plan(request: OrganizePlanRequest):
    if not planner_service:
        return fallback_organize_plan(request)
    if _ai_cooldown_active("organize"):
        return fallback_organize_plan(request)
    try:
        return planner_service.organize_plan(request)
    except Exception as exc:
        if not _remember_ai_quota("organize", exc):
            print(f"Warning: AI organize-plan failed, using fallback: {type(exc).__name__}: {str(exc)[:180]}")
        return fallback_organize_plan(request)

@app.post("/ai/hybrid-search", response_model=HybridSearchResponse)
async def hybrid_search(request: HybridSearchRequest):
    if not search_service:
        raise HTTPException(status_code=503, detail="Search Service is not configured")
    try:
        results = search_service.search(request.query, request.limit)
        return {"results": results}
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
