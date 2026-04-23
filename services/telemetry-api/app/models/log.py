from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class EventType(str, Enum):
    IGNITION_ON = "ignition_on"
    IGNITION_OFF = "ignition_off"
    SPEEDING = "speeding"
    GEOFENCE = "geofence"
    MAINTENANCE = "maintenance"
    FUEL_LOW = "fuel_low"


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class LogEntry(BaseModel):
    vehicle_id: str
    driver_id: Optional[str] = None
    event_type: EventType
    description: str = Field(min_length=1, max_length=500)
    severity: Severity = Severity.INFO
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("vehicle_id")
    @classmethod
    def vehicle_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("vehicle_id não pode ser vazio")
        return v


class LogResponse(LogEntry):
    id: str
