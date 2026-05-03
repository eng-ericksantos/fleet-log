from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime, timezone


class TelemetryData(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "vehicle_id": "ABC-1D23",
                "latitude": -23.5505,
                "longitude": -46.6333,
                "speed": 65.4,
                "fuel_level": 72.0,
                "engine_temp": 89.5,
                "timestamp": "2026-05-03T12:00:00Z",
            }
        }
    )

    vehicle_id: str = Field(..., description="ID ou placa do veículo")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude GPS")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude GPS")
    speed: float = Field(default=0, ge=0, le=400, description="Velocidade em km/h")
    fuel_level: Optional[float] = Field(default=None, ge=0, le=100, description="Nível de combustível (%)")
    engine_temp: Optional[float] = Field(default=None, ge=-40, le=200, description="Temperatura do motor (°C)")
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


class TelemetryResponse(TelemetryData):
    id: str = Field(..., description="ID único do registro no MongoDB")


class TelemetryLatestResponse(TelemetryResponse):
    event: str = Field(..., description="Descrição legível do estado do veículo")
    status: str = Field(..., description="Status derivado dos dados: normal | warning | critical")

