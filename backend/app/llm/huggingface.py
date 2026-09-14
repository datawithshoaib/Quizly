from __future__ import annotations

import httpx

from app.core.config import settings
from app.llm.base import LLMProvider


class HuggingFaceProvider(LLMProvider):
    def __init__(self) -> None:
        if not settings.huggingface_api_key:
            raise ValueError("HUGGINGFACE_API_KEY is not set")

    async def generate_text(
        self,
        *,
        model: str,
        prompt: str,
        temperature: float = 0.2,
    ) -> str:
        # Serverless Inference API (simple path). Some models may require a dedicated endpoint.
        url = f"https://api-inference.huggingface.co/models/{model}"
        headers = {"Authorization": f"Bearer {settings.huggingface_api_key}"}
        payload = {
            "inputs": prompt,
            "parameters": {
                "temperature": temperature,
                "max_new_tokens": 1200,
                "return_full_text": False,
            },
        }

        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()

        # Typical response: [{"generated_text": "..."}]
        if isinstance(data, list) and data and isinstance(data[0], dict) and "generated_text" in data[0]:
            return str(data[0]["generated_text"])

        # Sometimes models return {"generated_text": "..."} or an error blob
        if isinstance(data, dict) and "generated_text" in data:
            return str(data["generated_text"])

        raise RuntimeError(f"Unexpected HuggingFace response format: {data}")

