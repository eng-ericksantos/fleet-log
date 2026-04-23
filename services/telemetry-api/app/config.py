from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URL: str = "mongodb://mongodb:27017"
    MONGO_DB: str = "fleetlog_telemetry"
    CORE_API_URL: str = "http://core-api:3000"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
