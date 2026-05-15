from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import httpx
from dotenv import load_dotenv

# Import logic from other files
from ai.services.planner_service import PlannerService
from ai.services.search_service import SearchService
from ai.schemas.trip_plan_schema import (
    TripRecommendationRequest,
    LocationRankingRequest,
    OrganizePlanRequest,
    HybridSearchRequest,
    HybridSearchResponse
)

from pathlib import Path
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

OPEN_WEATHER_KEY = os.getenv('OPEN_WEATHER_KEY')

app = FastAPI(title="PlanTravel AI & Weather Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Initialize AI Service
try:
    planner_service = PlannerService()
    search_service = SearchService()
except Exception as e:
    print(f"Warning: AI Service initialization failed: {e}")
    planner_service = None
    search_service = None

@app.on_event("startup")
async def startup_event():
    if search_service:
        search_service.refresh_cache()

class WeatherResponse(BaseModel):
    temp: str
    condition: str
    rain_mm: float
    city: str

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
        raise HTTPException(status_code=503, detail="AI Service is not configured")
    try:
        return planner_service.rank_locations(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/organize-plan")
async def organize_plan(request: OrganizePlanRequest):
    if not planner_service:
        raise HTTPException(status_code=503, detail="AI Service is not configured")
    try:
        return planner_service.organize_plan(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
