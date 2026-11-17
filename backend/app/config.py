from functools import cached_property

from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET = "dev-only-secret-change-me-before-deploying"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    # psycopg 3 atende o engine async (API) e o sync (Celery, Alembic) com a mesma URL.
    database_url: str = "postgresql+psycopg://comunimap:comunimap@localhost:5442/comunimap"
    redis_url: str = "redis://localhost:6389/0"
    celery_broker_url: str = "redis://localhost:6389/1"

    secret_key: str = DEV_SECRET
    access_token_ttl_minutes: int = 60 * 24 * 7

    # Origens liberadas no CORS, separadas por vírgula.
    cors_origins: str = "http://localhost:5273,http://127.0.0.1:5273"

    media_root: str = "/data/media"
    max_photo_bytes: int = 8 * 1024 * 1024

    # Regra espacial: reporte aberto da mesma categoria dentro deste raio vira upvote.
    dedup_radius_meters: float = 15.0

    rate_limit_enabled: bool = True

    # Termos (separados por vírgula) que fazem a moderação automática segurar um registro.
    moderation_blocklist: str = ""

    @cached_property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @cached_property
    def blocklist_terms(self) -> list[str]:
        return [t.strip().lower() for t in self.moderation_blocklist.split(",") if t.strip()]


settings = Settings()

if settings.environment == "production" and settings.secret_key == DEV_SECRET:
    raise RuntimeError("Defina SECRET_KEY antes de subir em produção.")
