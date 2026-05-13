from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.ai.schemas.trip_plan_schema import (
    TripRecommendationRequest, 
    TripPlanResponse,
    LocationRankingRequest,
    LocationRankingResponse,
    OrganizePlanRequest,
    OrganizedTripPlan,
    HybridSearchRequest,
    HybridSearchResponse
)
from src.ai.services.planner_service import PlannerService
from src.ai.services.search_service import SearchService

app = FastAPI(title="AI Recommendation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

planner_service = PlannerService()
search_service = SearchService()

@app.on_event("startup")
async def startup_event():
    # Load embeddings on startup
    try:
        search_service.refresh_cache()
    except Exception as e:
        print(f"Warning: Could not load search cache: {e}")


@app.get("/")
def health_check():
    return {"message": "AI Recommendation Service is running"}


@app.post("/ai/generate-plan", response_model=TripPlanResponse)
async def generate_plan(request: TripRecommendationRequest):
    try:
        return planner_service.generate_trip_plans(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/ai/rank-locations", response_model=LocationRankingResponse)
async def rank_locations(request: LocationRankingRequest):
    try:
        return planner_service.rank_locations(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/ai/organize-plan", response_model=OrganizedTripPlan)
async def organize_plan(request: OrganizePlanRequest):
    try:
        return planner_service.organize_plan(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/ai/hybrid-search", response_model=HybridSearchResponse)
async def hybrid_search(request: HybridSearchRequest):
    try:
        results = search_service.search(request.query, request.limit)
        return {"results": results}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/ai/refresh-search-cache")
async def refresh_search_cache():
    try:
        search_service.refresh_cache()
        return {"message": "Search cache refreshed successfully"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)