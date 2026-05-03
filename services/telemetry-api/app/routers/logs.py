from fastapi import APIRouter, Request, Query
from app.models.log import LogEntry, LogResponse, Severity
from typing import Optional, List

router = APIRouter()


@router.get("/count", summary="Total de registros de log")
async def count_logs(
    request: Request,
    severity: Optional[Severity] = Query(default=None),
):
    """Returns total log/alert records, optionally filtered by severity."""
    query: dict = {}
    if severity:
        query["severity"] = severity.value
    total = await request.app.state.db["logs"].count_documents(query)
    return {"total": total}


@router.get("/", response_model=List[LogResponse], summary="Listar registros de log")
async def list_logs(
    request: Request,
    vehicle_id: Optional[str] = None,
    severity: Optional[Severity] = None,
    limit: int = Query(default=100, ge=1, le=500),
):
    query = {}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    if severity:
        query["severity"] = severity.value
    cursor = request.app.state.db["logs"].find(query).sort("timestamp", -1).limit(limit)
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results.append(doc)
    return results


@router.post("/", status_code=201, response_model=LogResponse, summary="Criar registro de log")
async def create_log(request: Request, entry: LogEntry):
    doc = entry.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    doc["event_type"] = doc["event_type"].value if hasattr(doc["event_type"], "value") else doc["event_type"]
    doc["severity"] = doc["severity"].value if hasattr(doc["severity"], "value") else doc["severity"]
    result = await request.app.state.db["logs"].insert_one(doc)
    return {"id": str(result.inserted_id), **entry.model_dump()}

