from fastapi import APIRouter, Request, HTTPException, Query
from bson import ObjectId
from bson.errors import InvalidId
from app.models.telemetry import TelemetryData, TelemetryResponse, TelemetryLatestResponse
from datetime import datetime, timezone
from typing import Optional, List

router = APIRouter()


@router.get("/count", summary="Total de registros de telemetria")
async def count_telemetry(request: Request, today: bool = Query(default=False)):
    """Returns total telemetry records. Use ?today=true to restrict to current UTC day."""
    query: dict = {}
    if today:
        start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        query["timestamp"] = {"$gte": start.isoformat()}
    total = await request.app.state.db["telemetry"].count_documents(query)
    return {"total": total}


@router.get("/", response_model=List[TelemetryResponse], summary="Listar registros de telemetria")
async def list_telemetry(
    request: Request,
    vehicle_id: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=500),
):
    query = {}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    cursor = request.app.state.db["telemetry"].find(query).sort("timestamp", -1).limit(limit)
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results.append(doc)
    return results


@router.get("/latest", response_model=List[TelemetryLatestResponse], summary="Últimos registros de telemetria enriquecidos")
async def latest_telemetry(
    request: Request,
    limit: int = Query(default=5, ge=1, le=50),
    vehicle_id: Optional[str] = None,
):
    """
    Returns the `limit` most recent telemetry records, each enriched with
    a human-readable `event` description and a derived `status` field.
    Used by the Logs/Audit tab to demonstrate polyglot persistence and
    data traceability across the microservices architecture.
    """
    query: dict = {}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id

    cursor = request.app.state.db["telemetry"].find(query).sort("timestamp", -1).limit(limit)
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))

        speed = doc.get("speed", 0) or 0
        fuel = doc.get("fuel_level")
        temp = doc.get("engine_temp")

        # Build a human-readable event description
        parts = [f"Velocidade: {speed} km/h"]
        if fuel is not None:
            parts.append(f"Combustível: {fuel}%")
        if temp is not None:
            parts.append(f"Temp. motor: {temp}°C")
        doc["event"] = " · ".join(parts)

        # Derive status from thresholds
        if speed > 100 or (fuel is not None and fuel < 15):
            doc["status"] = "critical"
        elif speed > 80 or (fuel is not None and fuel < 25):
            doc["status"] = "warning"
        else:
            doc["status"] = "normal"

        results.append(doc)
    return results


@router.get("/{telemetry_id}", response_model=TelemetryResponse, summary="Buscar registro de telemetria por ID")
async def get_telemetry(request: Request, telemetry_id: str):
    try:
        oid = ObjectId(telemetry_id)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail="ID inválido")
    doc = await request.app.state.db["telemetry"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Registro de telemetria não encontrado")
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/", status_code=201, response_model=TelemetryResponse, summary="Criar registro de telemetria")
async def create_telemetry(request: Request, data: TelemetryData):
    doc = data.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    result = await request.app.state.db["telemetry"].insert_one(doc)
    return {"id": str(result.inserted_id), **data.model_dump()}

