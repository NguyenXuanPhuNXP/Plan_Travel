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
    placeTypes: List[str] = Field(default_factory=list, max_length=3)
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
    plans: List[TripPlan] = Field(min_length=3, max_length=3)