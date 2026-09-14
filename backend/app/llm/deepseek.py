from __future__ import annotations

from app.core.config import settings
from app.llm.openai_compat import OpenAICompatibleChatProvider


class DeepSeekProvider(OpenAICompatibleChatProvider):
    def __init__(self) -> None:
        if not settings.deepseek_api_key:
            raise ValueError("DEEPSEEK_API_KEY is not set")
        super().__init__(base_url=settings.deepseek_base_url, api_key=settings.deepseek_api_key)

