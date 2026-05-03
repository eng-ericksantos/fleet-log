from pydantic import BaseModel, Field, field_validator, ConfigDict
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
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "vehicle_id": "ABC-1D23",
                "driver_id": None,
                "event_type": "speeding",
                "description": "Velocidade excessiva: 112 km/h",
                "severity": "warning",
                "timestamp": "2026-05-03T12:00:00Z",
            }
        }
    )

    vehicle_id: str = Field(..., description="ID ou placa do veículo")
    driver_id: Optional[str] = Field(default=None, description="ID do motorista (opcional)")
    event_type: EventType = Field(..., description="Tipo de evento registrado")
    description: str = Field(..., min_length=1, max_length=500, description="Descrição detalhada do evento")
    severity: Severity = Field(default=Severity.INFO, description="Severidade do evento")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp UTC do registro",
    )

    @field_validator("vehicle_id")
    @classmethod
    def vehicle_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("vehicle_id não pode ser vazio")
        return v


class LogResponse(LogEntry):
    id: str = Field(..., description="ID único do registro no MongoDB")

