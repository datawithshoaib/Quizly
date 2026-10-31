from __future__ import annotations

from langchain_core.language_models import BaseLanguageModel
from langchain_groq import ChatGroq
from langchain_openrouter import ChatOpenRouter
from pydantic import BaseModel

from app.core.config import settings


class ModelOption(BaseModel):
    id: str
    provider: str
    label: str
    provider_model: str


# One fixed model per provider. Groq is the primary provider, OpenRouter the
# alternative. Users bring their own key; the server never holds one.
MODEL_OPTIONS: tuple[ModelOption, ...] = (
    ModelOption(
        id="groq:gpt-oss-120b",
        provider="groq",
        label="Groq",
        provider_model="openai/gpt-oss-120b",
    ),
    ModelOption(
        id="openrouter:gpt-oss-120b",
        provider="openrouter",
        label="OpenRouter",
        provider_model="openai/gpt-oss-120b",
    ),
)

MODEL_OPTIONS_BY_PROVIDER = {option.provider: option for option in MODEL_OPTIONS}
DEFAULT_PROVIDER = MODEL_OPTIONS[0].provider

LanguageModel = BaseLanguageModel


class ModelNotConfiguredError(RuntimeError):
    """Raised when a request arrives without the user's API key."""


class UnknownProviderError(ValueError):
    """Raised when a request refers to a provider not offered by the API."""


def get_model_option(provider: str | None = None) -> ModelOption:
    """Return the model for a provider, defaulting to Groq."""
    provider = (provider or DEFAULT_PROVIDER).strip().lower()
    try:
        return MODEL_OPTIONS_BY_PROVIDER[provider]
    except KeyError as error:
        raise UnknownProviderError(f"Unknown provider: {provider}") from error


def create_model(
    option: ModelOption,
    *,
    temperature: float,
    api_key: str | None,
) -> LanguageModel:
    """Create the LangChain model for an option using the user's ``api_key``."""
    if not api_key:
        raise ModelNotConfiguredError(f"Enter your {option.label} API key to continue.")

    timeout = settings.llm_timeout_seconds

    if option.provider == "groq":
        return ChatGroq(
            model=option.provider_model,
            api_key=api_key,
            temperature=temperature,
            timeout=timeout,
            max_retries=1,
        )

    if option.provider == "openrouter":
        return ChatOpenRouter(
            model=option.provider_model,
            api_key=api_key,
            base_url=settings.openrouter_base_url,
            temperature=temperature,
            timeout=int(timeout * 1000),
            max_retries=1,
            app_title=settings.app_name,
            app_url=settings.frontend_origin,
        )

    raise UnknownProviderError(f"Unknown provider: {option.provider}")
