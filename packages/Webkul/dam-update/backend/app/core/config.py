"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings, sourced from the process environment.

    Defaults mirror docker-compose.yml so the app can boot with no env vars
    set (e.g. during local scripting); tests override DATABASE_URL directly.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # General
    ENVIRONMENT: str = "production"
    FRONTEND_ORIGIN: str = "http://localhost:8080"
    APP_NAME: str = "DevAnnounce"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://devannounce:devannounce@postgres:5432/devannounce"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Auth
    JWT_SECRET: str = "dev-secret-change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    RESET_TOKEN_EXPIRE_HOURS: int = 1
    VERIFY_TOKEN_EXPIRE_HOURS: int = 24

    # MinIO / object storage
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "devannounce"
    MINIO_SECRET_KEY: str = "devannounce123"
    MINIO_BUCKET: str = "devannounce"
    MINIO_PUBLIC_URL: str = "/storage"
    MINIO_SECURE: bool = False

    # Optional outbound SMTP (email is always logged to stdout regardless)
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str = "DevAnnounce <no-reply@devannounce.dev>"
    SMTP_USE_TLS: bool = True

    # Seeding
    SEED_DEMO_DATA: bool = True

    # News fetching
    NEWS_FETCH_HOUR_UTC: int = 0
    NEWS_FETCH_MINUTE_UTC: int = 0

    @property
    def is_test(self) -> bool:
        return self.ENVIRONMENT.lower() == "test"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
