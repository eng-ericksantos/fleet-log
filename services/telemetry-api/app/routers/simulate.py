import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Query, Request
from app.models.telemetry import TelemetryData
from app.models.log import LogEntry, EventType, Severity
from typing import List, Optional

router = APIRouter()

# Coordenadas base: São Paulo
BASE_LAT = -23.5505
BASE_LON = -46.6333


def _serialize_log(entry: LogEntry) -> dict:
    doc = entry.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    doc["event_type"] = doc["event_type"].value if hasattr(doc["event_type"], "value") else doc["event_type"]
    doc["severity"] = doc["severity"].value if hasattr(doc["severity"], "value") else doc["severity"]
    return doc


@router.post("/gps", status_code=201)
async def simulate_gps(request: Request, vehicle_id: str):
    """Simula o recebimento de uma posição GPS e nível de combustível."""
    now = datetime.now(timezone.utc)

    telemetry = TelemetryData(
        vehicle_id=vehicle_id,
        latitude=BASE_LAT + random.uniform(-0.05, 0.05),
        longitude=BASE_LON + random.uniform(-0.05, 0.05),
        speed=round(random.uniform(0, 120), 1),
        fuel_level=round(random.uniform(10, 100), 1),
        engine_temp=round(random.uniform(70, 110), 1),
        timestamp=now,
    )

    doc = telemetry.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    result = await request.app.state.db["telemetry"].insert_one(doc)
    telemetry_id = str(result.inserted_id)

    # Gera logs automáticos com base nos dados
    log_docs = []
    logs_created = []

    if telemetry.speed > 100:
        log = LogEntry(
            vehicle_id=vehicle_id,
            event_type=EventType.SPEEDING,
            description=f"Velocidade excessiva: {telemetry.speed} km/h",
            severity=Severity.WARNING,
            timestamp=now,
        )
        log_docs.append(_serialize_log(log))
        logs_created.append("speeding")

    if telemetry.fuel_level is not None and telemetry.fuel_level < 20:
        log = LogEntry(
            vehicle_id=vehicle_id,
            event_type=EventType.FUEL_LOW,
            description=f"Combustível baixo: {telemetry.fuel_level}%",
            severity=Severity.CRITICAL,
            timestamp=now,
        )
        log_docs.append(_serialize_log(log))
        logs_created.append("fuel_low")

    if log_docs:
        await request.app.state.db["logs"].insert_many(log_docs)

    return {
        "telemetry_id": telemetry_id,
        "data": telemetry.model_dump(),
        "logs_generated": logs_created,
    }


# ---------------------------------------------------------------------------
# Vehicles used as seed reference (base coordinates per city)
# ---------------------------------------------------------------------------
_SEED_VEHICLES = [
    {"id": "VH-001", "lat": -23.5505, "lon": -46.6333},  # São Paulo
    {"id": "VH-002", "lat": -22.9068, "lon": -43.1729},  # Rio de Janeiro
    {"id": "VH-003", "lat": -19.9167, "lon": -43.9345},  # Belo Horizonte
]


@router.post("/seed", status_code=201)
async def seed_telemetry(
    request: Request,
    count: int = Query(default=10, ge=1, le=200, description="Registros por veículo"),
    clear: bool = Query(default=False, description="Limpar registros existentes antes de inserir"),
    vehicle_ids: Optional[List[str]] = Query(
        default=None,
        description="Placas/IDs reais de veículos vindos do NestJS. "
                    "Se não fornecido, usa os veículos-padrão de demonstração.",
    ),
):
    """
    Gera `count` registros de telemetria aleatórios por veículo.
    Quando `vehicle_ids` é fornecido (e.g. placas do Postgres), os registros
    usam esses IDs como `vehicle_id` no MongoDB, estabelecendo a ligação
    lógica entre os dois domínios de dados.
    Use `clear=true` para limpar a coleção antes de inserir.
    """
    db = request.app.state.db

    if clear:
        await db["telemetry"].delete_many({})

    # Build vehicle list: use provided IDs or fall back to defaults
    if vehicle_ids:
        vehicles = [
            {"id": vid, "lat": _SEED_VEHICLES[i % len(_SEED_VEHICLES)]["lat"],
             "lon": _SEED_VEHICLES[i % len(_SEED_VEHICLES)]["lon"]}
            for i, vid in enumerate(vehicle_ids)
        ]
    else:
        vehicles = _SEED_VEHICLES

    now = datetime.now(timezone.utc)
    window_seconds = 7200  # 2 hours
    interval = window_seconds / count
    docs = []

    for vehicle in vehicles:
        # Simulate a realistic speed profile (start slow, peak, slow down)
        base_speed = random.uniform(30, 80)
        for i in range(count):
            ts = now - timedelta(seconds=window_seconds - i * interval)
            # Gentle random walk on speed
            base_speed = max(0.0, min(130.0, base_speed + random.uniform(-15, 15)))
            fuel = round(random.uniform(20, 100), 1)
            temp = round(random.uniform(70, 105), 1)
            doc = {
                "vehicle_id": vehicle["id"],
                "latitude": round(vehicle["lat"] + random.uniform(-0.08, 0.08), 6),
                "longitude": round(vehicle["lon"] + random.uniform(-0.08, 0.08), 6),
                "speed": round(base_speed, 1),
                "fuel_level": fuel,
                "engine_temp": temp,
                "timestamp": ts.isoformat(),
            }
            docs.append(doc)

    result = await db["telemetry"].insert_many(docs)
    return {
        "inserted": len(result.inserted_ids),
        "vehicles": [v["id"] for v in vehicles],
        "records_per_vehicle": count,
    }
