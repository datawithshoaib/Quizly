from __future__ import annotations

from pydantic import BaseModel


class ModelOption(BaseModel):
    id: str
    provider: str
    label: str
    provider_model: str
    supports_json: bool = True


_MODELS: list[ModelOption] = [
    # OpenRouter (open-source models commonly available via OpenRouter)
    ModelOption(
        id="openrouter:llama-3.1-8b-instruct",
        provider="openrouter",
        label="OpenRouter - Llama 3.1 8B Instruct",
        provider_model="meta-llama/llama-3.1-8b-instruct",
        supports_json=True,
    ),
    ModelOption(
        id="openrouter:mistral-7b-instruct",
        provider="openrouter",
        label="OpenRouter - Mistral 7B Instruct",
        provider_model="mistralai/mistral-7b-instruct",
        supports_json=True,
    ),
    # Gemini (not open-source, but included per requirement)
    ModelOption(
        id="gemini:gemini-2.0-flash",
        provider="gemini",
        label="Gemini - 2.0 Flash",
        provider_model="gemini-2.0-flash",
        supports_json=True,
    ),
    ModelOption(
        id="gemini:gemini-2.5-flash",
        provider="gemini",
        label="Gemini - 2.5 Flash",
        provider_model="gemini-2.5-flash",
        supports_json=True,
    ),
    # DeepSeek (API; model id depends on account)
    ModelOption(
        id="deepseek:deepseek-chat",
        provider="deepseek",
        label="DeepSeek - Chat",
        provider_model="deepseek-chat",
        supports_json=True,
    ),
    # HuggingFace (serverless inference; may vary by model availability)
    ModelOption(
        id="huggingface:mistral-7b-instruct-v0.3",
        provider="huggingface",
        label="HuggingFace - Mistral 7B Instruct v0.3",
        provider_model="mistralai/Mistral-7B-Instruct-v0.3",
        supports_json=False,
    ),
]


def list_model_options() -> list[ModelOption]:
    return list(_MODELS)


def get_model_option(model_id: str) -> ModelOption:
    for m in _MODELS:
        if m.id == model_id:
            return m
    raise ValueError(f"Unknown model_id: {model_id}")

