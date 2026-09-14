from __future__ import annotations

import httpx

from app.core.config import settings
from app.llm.base import LLMProvider


class GeminiProvider(LLMProvider):
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not set")

    async def generate_text(
        self,
        *,
        model: str,
        prompt: str,
        temperature: float = 0.2,
    ) -> str:
        # REST docs (current): https://ai.google.dev/api/generate-content
        # Prefer API key via header (avoids leaking key in URLs / exceptions).
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": settings.gemini_api_key,
        }
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                # Many Gemini models support JSON output via responseMimeType
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            try:
                r = await client.post(url, headers=headers, json=payload)
                r.raise_for_status()
                data = r.json()
            except httpx.HTTPStatusError as e:
                # Keep error useful but avoid echoing secrets.
                body = (e.response.text or "").strip()
                body_preview = body[:800] + ("..." if len(body) > 800 else "")
                raise RuntimeError(
                    f"Gemini API request failed ({e.response.status_code}). "
                    f"Model={model}. Response={body_preview}"
                ) from e

        try:
            parts = data["candidates"][0]["content"]["parts"]
            # Usually a single part with "text"
            return "".join(p.get("text", "") for p in parts)
        except Exception as e:  # pragma: no cover
            raise RuntimeError(f"Unexpected Gemini response format: {data}") from e

