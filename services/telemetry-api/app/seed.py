"""
Auto-seed: populates telemetry and log collections on first startup
(or whenever collections are found empty).

Called automatically by the lifespan hook in main.py.
Can also be triggered manually via POST /api/simulate/seed.
"""
import random
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorDatabase

_SEED_VEHICLES = [
    {"id": "VH-001", "lat": -23.5505, "lon": -46.6333},
    {"id": "VH-002", "lat": -22.9068, "lon": -43.1729},
    {"id": "VH-003", "lat": -19.9167, "lon": -43.9345},
    {"id": "VH-004", "lat": -25.4284, "lon": -49.2733},
    {"id": "VH-005", "lat": -30.0346, "lon": -51.2177},
]

_RECORDS_PER_VEHICLE = 30   # ~2 h de histórico, intervalo ~4 min
_WINDOW_SECONDS = 7_200


def _build_telemetry_docs(vehicles: list[dict], count: int) -> list[dict]:
    now = datetime.now(timezone.utc)
    interval = _WINDOW_SECONDS / count
    docs: list[dict] = []

    for vehicle in vehicles:
        base_speed = random.uniform(30, 80)
        for i in range(count):
            ts = now - timedelta(seconds=_WINDOW_SECONDS - i * interval)
            base_speed = max(0.0, min(130.0, base_speed + random.uniform(-15, 15)))
            docs.append(
                {
                    "vehicle_id": vehicle["id"],
                    "latitude": round(vehicle["lat"] + random.uniform(-0.08, 0.08), 6),
                    "longitude": round(vehicle["lon"] + random.uniform(-0.08, 0.08), 6),
                    "speed": round(base_speed, 1),
                    "fuel_level": round(random.uniform(20, 100), 1),
                    "engine_temp": round(random.uniform(70, 105), 1),
                    "timestamp": ts.isoformat(),
                }
            )
    return docs


def _build_log_docs(telemetry_docs: list[dict]) -> list[dict]:
    """Derives warning/critical log entries from generated telemetry."""
    logs: list[dict] = []
    for doc in telemetry_docs:
        if doc["speed"] > 100:
            logs.append(
                {
                    "vehicle_id": doc["vehicle_id"],
                    "event_type": "speeding",
                    "description": f"Velocidade excessiva: {doc['speed']} km/h",
                    "severity": "warning",
                    "timestamp": doc["timestamp"],
                }
            )
        if doc["fuel_level"] < 20:
            logs.append(
                {
                    "vehicle_id": doc["vehicle_id"],
                    "event_type": "fuel_low",
                    "description": f"Combustível baixo: {doc['fuel_level']}%",
                    "severity": "critical",
                    "timestamp": doc["timestamp"],
                }
            )
    return logs


async def run_seed_if_empty(
    db: "AsyncIOMotorDatabase",
    vehicles: list[dict] | None = None,
    count: int = _RECORDS_PER_VEHICLE,
) -> None:
    """
    Seeds telemetry (and derived logs) only when the collection is empty.

    Parameters
    ----------
    db:       Motor async database instance.
    vehicles: Optional list of ``{"id": str, "lat": float, "lon": float}``
              dicts — e.g. plates fetched from the NestJS Core-API.
              Falls back to the built-in demo vehicles when not provided.
    count:    Number of telemetry records to insert per vehicle.
    """
    existing = await db["telemetry"].count_documents({})
    if existing > 0:
        print(f"[seed] Telemetry collection already has {existing} records — skipping auto-seed.")
        return

    target_vehicles = vehicles or _SEED_VEHICLES
    telemetry_docs = _build_telemetry_docs(target_vehicles, count)
    log_docs = _build_log_docs(telemetry_docs)

    await db["telemetry"].insert_many(telemetry_docs)
    if log_docs:
        await db["logs"].insert_many(log_docs)

    print(
        f"[seed] Auto-seed complete: {len(telemetry_docs)} telemetry records "
        f"and {len(log_docs)} log entries inserted for "
        f"{[v['id'] for v in target_vehicles]}."
    )
