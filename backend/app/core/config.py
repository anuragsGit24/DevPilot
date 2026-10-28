from functools import lru_cache
from typing import Annotated

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DevPilot API"
    environment: str = "development"
    database_url: str = Field(
        default="postgresql+asyncpg://devpilot:devpilot@localhost:5432/devpilot"
    )
    cors_origins: list[str] = Field(default=["http://localhost:5173", "http://127.0.0.1:5173"])

    # Security & JWT Authentication
    secret_key: str = Field(
        default="devpilot-enterprise-secure-jwt-secret-key-2026-replace-in-prod"
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    password_reset_expire_minutes: int = 30
<<<<<<< Updated upstream
=======

    # Requirements ingestion and embeddings (Engineer 1)
    requirements_max_upload_bytes: int = 10 * 1024 * 1024
    embedding_provider: str = "api"
    embedding_model: str = "gemini-embedding-2"
    embedding_dimensions: int = 768
    embedding_device: str = "auto"
    embedding_batch_size: int = 16
    embedding_api_url: str = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-embedding-2:embedContent"
    )
    embedding_api_key: str | None = None
    embedding_timeout_seconds: float = 30.0

    # AI Pipeline & LLM Generation (Engineer 2)
    llm_provider: str = "mock"  # "gemini", "openai", "anthropic", "mock"
    llm_model: str = "gemini-1.5-pro"
    llm_api_key: str | None = None
    llm_temperature: float = 0.2
    llm_max_tokens: int = 4096
    llm_timeout_seconds: float = 60.0
>>>>>>> Stashed changes
    
    # Failed-login controls & Account Lockout
    max_failed_attempts: int = 5
    lockout_duration_minutes: int = 15

    # GCP Cloud SQL Configuration
    gcp_project_id: str | None = None
    gcp_region: str = "us-central1"
    cloud_sql_instance: str | None = None
    cloud_sql_connection_name: str | None = None  # e.g., "my-gcp-project:us-central1:devpilot-db"
    use_cloud_sql_auth_proxy: bool = False

    model_config = SettingsConfigDict(
        env_prefix="DEVPILOT_",
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
