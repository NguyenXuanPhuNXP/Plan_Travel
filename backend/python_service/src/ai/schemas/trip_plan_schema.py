from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class DestinationItem(BaseModel):
    name: str
    type: Optional[str] = None
    description: Optional[str] = None
    estimatedCost: int = 0


class ScheduleItem(BaseModel):
    time: str
    activity: str
    location: str
    cost: int = 0


class TripPlan(BaseModel):
    title: str
    region: str
    summary: str
    estimatedBudget: int
    reason: str
    destinations: List[DestinationItem]
    schedule: List[ScheduleItem]


class TripRecommendationRequest(BaseModel):
    destinationType: str
    placeTypes: List[str] = Field(default_factory=list, max_length=5)
    region: Optional[str] = None
    weather: Optional[str] = None
    budget: int

    @field_validator("budget")
    @classmethod
    def validate_budget(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("budget phải lớn hơn 0")
        return value


class TripPlanResponse(BaseModel):
    plans: List[TripPlan]


# New schemas for specific AI tasks
class LocationInput(BaseModel):
    id: Optional[str] = None # Thêm ID để định danh chính xác
    name: str
    category: Optional[str] = None
    estimatedCost: Optional[int] = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    suggestedDuration: Optional[str] = None

class LocationRankingRequest(BaseModel):
    region: str
    days: Optional[int] = 3
    budget: Optional[int] = 5000000
    preferences: List[str] = []
    locations: List[LocationInput]

class RankedLocation(BaseModel):
    name: str
    id: Optional[str] = None # Trả về ID nếu có
    score: int
    reason: str

class LocationRankingResponse(BaseModel):
    rankings: List[RankedLocation]

class OrganizePlanRequest(BaseModel):
    travelerCount: int = Field(default=1, ge=1, le=100)
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    transportMode: str = 'other'
    weatherContext: Optional[str] = None
    region: str
    days: int
    budget: Optional[int] = None
    preferences: List[str] = []
    locations: List[LocationInput]
    focusLocationId: Optional[str] = None # Địa điểm chủ đạo của chuyến đi

class PlanActivity(BaseModel):
    locationId: Optional[str] = None # Dùng ID để khớp dữ liệu chính xác
    locationName: str
    startTime: str
    endTime: str
    note: str
    travelMinutesToNext: int = 15

class DayPlan(BaseModel):
    dayNumber: int
    title: str
    items: List[PlanActivity]

class CostAllocation(BaseModel):
    transport: int = Field(ge=0)
    accommodation: int = Field(ge=0)
    meals: int = Field(ge=0)
    attractions: int = Field(ge=0)
    contingency: int = Field(ge=0)


class OrganizedTripPlan(BaseModel):
    transport: str
    accommodation: str
    costAllocation: CostAllocation
    risks: List[str]
    weather: str
    planName: str
    description: str
    days: List[DayPlan]


class HybridSearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 10
    region: Optional[str] = None
    category: Optional[str] = None


class SearchResult(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    tags: Optional[List[str]] = None
    latitude: float
    longitude: float
    score: float
    semanticScore: Optional[float] = None
    keywordScore: Optional[float] = None


class HybridSearchResponse(BaseModel):
    results: List[SearchResult]

