from __future__ import annotations

import httpx

from app.core.config import settings
from app.llm.base import LLMProvider


class OpenAICompatibleChatProvider(LLMProvider):
    def __init__(self, *, base_url: str, api_key: str, extra_headers: dict[str, str] | None = None):
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._extra_headers = extra_headers or {}

    async def generate_text(
        self,
        *,
        model: str,
        prompt: str,
        temperature: float = 0.2,
    ) -> str:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            **self._extra_headers,
        }
        payload = {
            "model": model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that returns only JSON when asked."},
                {"role": "user", "content": prompt},
            ],
        }

        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            r = await client.post(f"{self._base_url}/chat/completions", headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()

        try:
            return data["choices"][0]["message"]["content"]
        except Exception as e:  # pragma: no cover
            raise RuntimeError(f"Unexpected response format from provider: {data}") from e

