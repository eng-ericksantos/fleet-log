import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
from app.config import settings
from app.seed import run_seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
    app.state.db = app.state.mongo_client[settings.MONGO_DB]
    print(f"Connected to MongoDB: {settings.MONGO_URL}/{settings.MONGO_DB}")

    await app.state.db["telemetry"].create_index([("vehicle_id", 1), ("timestamp", -1)])
    await app.state.db["logs"].create_index([("vehicle_id", 1), ("timestamp", -1)])
    await app.state.db["logs"].create_index([("severity", 1)])
    print("MongoDB indexes ensured")

    await run_seed_if_empty(app.state.db)

    yield
    app.state.mongo_client.close()


app = FastAPI(
    title="Fleet-Log Telemetry API",
    version="1.0",
    description="API de telemetria e logs de eventos de frota (MongoDB).",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Response-Time"],
)


@app.middleware("http")
async def add_response_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time"] = f"{elapsed_ms:.2f}ms"
    return response

from app.routers import telemetry, logs, simulate

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
