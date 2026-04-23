from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
    app.state.db = app.state.mongo_client[settings.MONGO_DB]
    print(f"Connected to MongoDB: {settings.MONGO_URL}/{settings.MONGO_DB}")

    # Índices para queries de alto volume
    await app.state.db["telemetry"].create_index([("vehicle_id", 1), ("timestamp", -1)])
    await app.state.db["logs"].create_index([("vehicle_id", 1), ("timestamp", -1)])
    await app.state.db["logs"].create_index([("severity", 1)])
    print("MongoDB indexes ensured")

    yield
    app.state.mongo_client.close()


app = FastAPI(title="Fleet-Log Telemetry API", version="1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import telemetry, logs, simulate  # noqa: E402

app.include_router(telemetry.router, prefix="/api/telemetry", tags=["Telemetry"])
app.include_router(logs.router, prefix="/api/logs", tags=["Logs"])
app.include_router(simulate.router, prefix="/api/simulate", tags=["Simulate"])


@app.get("/")
async def root():
    return {"service": "telemetry-api", "status": "running"}


@app.get("/health")
async def health():
    try:
        await app.state.mongo_client.admin.command("ping")
        return {"status": "ok", "mongo": "connected"}
    except Exception:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "mongo": "disconnected"},
        )
