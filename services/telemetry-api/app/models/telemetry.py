from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone


class TelemetryData(BaseModel):
    vehicle_id: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    speed: float = Field(default=0, ge=0, le=400)
    fuel_level: Optional[float] = Field(default=None, ge=0, le=100)
    engine_temp: Optional[float] = Field(default=None, ge=-40, le=200)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("vehicle_id")
    @classmethod
    def vehicle_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("vehicle_id não pode ser vazio")
        return v


class TelemetryResponse(TelemetryData):
    id: str
