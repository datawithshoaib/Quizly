from __future__ import annotations

from langchain_core.language_models import BaseLanguageModel
from langchain_deepseek import ChatDeepSeek
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEndpoint
from langchain_openrouter import ChatOpenRouter
from pydantic import BaseModel

from app.core.config import settings


class ModelOption(BaseModel):
    id: str
    provider: str
    label: str
    provider_model: str
    supports_json: bool = True


MODEL_OPTIONS: tuple[ModelOption, ...] = (
    ModelOption(
        id="openrouter:llama-3.1-8b-instruct",
        provider="openrouter",
        label="OpenRouter - Llama 3.1 8B Instruct",
        provider_model="meta-llama/llama-3.1-8b-instruct",
    ),
    ModelOption(
        id="openrouter:mistral-7b-instruct",
        provider="openrouter",
        label="OpenRouter - Mistral 7B Instruct",
        provider_model="mistralai/mistral-7b-instruct",
    ),
    ModelOption(
        id="gemini:gemini-3.8-flash",
        provider="gemini",
        label="Gemini - 3.8 Flash",
        provider_model="gemini-3.8-flash",
    ),
    ModelOption(
        id="gemini:gemini-3.5-flash-lite",
        provider="gemini",
        label="Gemini - 3.5 Flash Lite",
        provider_model="gemini-3.5-flash-lite",
    ),
    ModelOption(
        id="deepseek:deepseek-flash",
        provider="deepseek",
        label="DeepSeek - Flash",
        provider_model="deepseek-flash",
    ),
    ModelOption(
        id="huggingface:llama-3.1-8b-instruct",
        provider="huggingface",
        label="Hugging Face - Llama 3.1 8B Instruct",
        provider_model="meta-llama/Llama-3.1-8B-Instruct",
        supports_json=False,
    ),
)

MODEL_OPTIONS_BY_ID = {option.id: option for option in MODEL_OPTIONS}
MODEL_ID_ALIASES = {
    # Keep saved quizzes and older clients usable when a retired provider ID changes.
    "gemini:gemini-2.0-flash": "gemini:gemini-3.8-flash",
    "gemini:gemini-2.5-flash": "gemini:gemini-3.5-flash-lite",
    "deepseek:deepseek-chat": "deepseek:deepseek-flash",
    "huggingface:mistral-7b-instruct-v0.3": "huggingface:llama-3.1-8b-instruct",
}

LanguageModel = BaseLanguageModel


class ModelNotConfiguredError(RuntimeError):
    """Raised when a provider is selected without its API key configured."""


class UnknownModelError(ValueError):
    """Raised when a request refers to a model not offered by the API."""


def list_model_options() -> list[ModelOption]:
    return list(MODEL_OPTIONS)


def get_model_option(model_id: str) -> ModelOption:
    canonical_id = MODEL_ID_ALIASES.get(model_id, model_id)
    try:
        return MODEL_OPTIONS_BY_ID[canonical_id]
    except KeyError as error:
        raise UnknownModelError(f"Unknown model_id: {model_id}") from error


def _require_api_key(provider: str, api_key: str | None, env_name: str) -> str:
    if not api_key:
        raise ModelNotConfiguredError(
            f"{provider} is not configured. Set {env_name} to use this model."
        )
    return api_key


def create_model(
    option: ModelOption,
    *,
    temperature: float,
) -> LanguageModel:
    """Create the LangChain model selected by a public model option."""
    timeout = settings.llm_timeout_seconds

    if option.provider == "openrouter":
        api_key = _require_api_key("OpenRouter", settings.openrouter_api_key, "OPENROUTER_API_KEY")
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

    if option.provider == "deepseek":
        api_key = _require_api_key("DeepSeek", settings.deepseek_api_key, "DEEPSEEK_API_KEY")
        return ChatDeepSeek(
            model=option.provider_model,
            api_key=api_key,
            api_base=settings.deepseek_base_url,
            temperature=temperature,
            timeout=timeout,
            max_retries=1,
        )

    if option.provider == "gemini":
        api_key = _require_api_key("Gemini", settings.gemini_api_key, "GEMINI_API_KEY")
        return ChatGoogleGenerativeAI(
            model=option.provider_model,
            api_key=api_key,
            vertexai=False,
            temperature=temperature,
            timeout=timeout,
            max_retries=1,
        )

    if option.provider == "huggingface":
        api_key = _require_api_key(
            "Hugging Face", settings.huggingface_api_key, "HUGGINGFACE_API_KEY"
        )
        endpoint = HuggingFaceEndpoint(
            task="text-generation",
            max_new_tokens=4096,
            temperature=temperature,
            do_sample=temperature > 0,
            huggingfacehub_api_token=api_key,
            **(
                {"endpoint_url": settings.huggingface_endpoint_url}
                if settings.huggingface_endpoint_url
                else {"repo_id": option.provider_model, "provider": "auto"}
            ),
        )
        return endpoint

    raise UnknownModelError(f"Unknown provider: {option.provider}")
