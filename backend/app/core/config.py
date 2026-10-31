from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


_BACKEND_DIR = Path(__file__).resolve().parents[2]  # .../backend


class Settings(BaseSettings):
    # Load backend/.env regardless of where the server is started from.
    # Real environment variables (e.g. on Render) take precedence over the file.
    model_config = SettingsConfigDict(
        env_file=_BACKEND_DIR / ".env",
        extra="ignore",
    )

    app_name: str = "Quizly"
    environment: str = "dev"

    # CORS: comma-separated list of allowed origins, plus an optional regex
    # (e.g. for Vercel preview deployments).
    frontend_origin: str = "http://localhost:3000"
    frontend_origin_regex: str | None = None

    # DB
    database_url: str = "sqlite:///./quizly.db"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.frontend_origin.split(",") if o.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        # Render/Heroku-style URLs use postgres:// which SQLAlchemy doesn't accept;
        # point them at the psycopg (v3) driver.
        url = self.database_url
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url

    # OpenRouter endpoint. Users supply their own Groq/OpenRouter API key per
    # request; the server does not hold any provider keys.
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Model request timeout.
    llm_timeout_seconds: float = 60.0


settings = Settings()

