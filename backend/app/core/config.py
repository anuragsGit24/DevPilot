from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DevPilot API"
    environment: str = "development"
    database_url: str = Field(
        default="postgresql+asyncpg://devpilot:devpilot@localhost:5432/devpilot"
    )
    cors_origins: list[str] = Field(default=["http://localhost:5173"])

    model_config = SettingsConfigDict(
        env_prefix="DEVPILOT_",
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
