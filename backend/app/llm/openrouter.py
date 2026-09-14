from __future__ import annotations

from app.core.config import settings
from app.llm.openai_compat import OpenAICompatibleChatProvider


class OpenRouterProvider(OpenAICompatibleChatProvider):
    def __init__(self) -> None:
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY is not set")
        super().__init__(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
            extra_headers={
                # Optional but recommended by OpenRouter
                "HTTP-Referer": "http://localhost",
                "X-Title": "Quizly",
            },
        )

