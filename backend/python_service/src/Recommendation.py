from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.ai.schemas.trip_plan_schema import TripRecommendationRequest, TripPlanResponse
from src.ai.services.planner_service import PlannerService

app = FastAPI(title="AI Recommendation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

planner_service = PlannerService()


@app.get("/")
def health_check():
    return {"message": "AI Recommendation Service is running"}


@app.post("/api/recommendations", response_model=TripPlanResponse)
def recommend_trip(request: TripRecommendationRequest):
    try:
        return planner_service.generate_trip_plans(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc