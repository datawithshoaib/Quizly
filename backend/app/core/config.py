from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


_BACKEND_DIR = Path(__file__).resolve().parents[2]  # .../backend
_REPO_ROOT_DIR = _BACKEND_DIR.parent  # .../quizly


class Settings(BaseSettings):
    # Load env vars regardless of where the server is started from.
    # Later files override earlier ones.
    model_config = SettingsConfigDict(
        env_file=[_REPO_ROOT_DIR / ".env", _BACKEND_DIR / ".env"],
        extra="ignore",
    )

    app_name: str = "Quizly"
    environment: str = "dev"

    # CORS
    frontend_origin: str = "http://localhost:3000"

    # DB
    database_url: str = "sqlite:///./quizly.db"

    # Provider API keys and OpenAI-compatible endpoint overrides.
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    deepseek_api_key: str | None = None
    deepseek_base_url: str = "https://api.deepseek.com"

    gemini_api_key: str | None = None

    huggingface_api_key: str | None = None
    huggingface_endpoint_url: str | None = None

    # Model used for every request (an id from MODEL_OPTIONS). When unset, the
    # first model whose provider has an API key configured is used.
    llm_model_id: str | None = None

    # Model request timeout.
    llm_timeout_seconds: float = 60.0


settings = Settings()

