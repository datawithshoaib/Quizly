from __future__ import annotations

import json
from json import JSONDecodeError

from pydantic import ValidationError

from app.llm.deepseek import DeepSeekProvider
from app.llm.gemini import GeminiProvider
from app.llm.huggingface import HuggingFaceProvider
from app.llm.openrouter import OpenRouterProvider
from app.llm.prompt import build_quiz_prompt, build_report_prompt
from app.llm.registry import get_model_option
from app.llm.schema import GenerateQuizRequest, QuizOut, ReportRequest


def _extract_json(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        # Strip fenced code blocks like ```json ... ```
        t = t.strip("`")
        # After stripping backticks, it may still contain a leading language token
        t = t.replace("json", "", 1).strip()

    # Best-effort extraction of the first JSON object
    start = t.find("{")
    end = t.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise JSONDecodeError("No JSON object found in text", t, 0)
    return t[start : end + 1]


def _provider_for(provider: str):
    if provider == "openrouter":
        return OpenRouterProvider()
    if provider == "gemini":
        return GeminiProvider()
    if provider == "deepseek":
        return DeepSeekProvider()
    if provider == "huggingface":
        return HuggingFaceProvider()
    raise ValueError(f"Unknown provider: {provider}")


async def generate_quiz(request: GenerateQuizRequest) -> QuizOut:
    model = get_model_option(request.model_id)
    provider = _provider_for(model.provider)

    schema = QuizOut.model_json_schema()
    prompt = build_quiz_prompt(
        topic=request.topic,
        difficulty=request.difficulty,
        num_questions=int(request.num_questions),
        schema=schema,
    )

    # Prefer deterministic output to maximize schema compliance.
    raw = await provider.generate_text(model=model.provider_model, prompt=prompt, temperature=0.0)
    try:
        extracted = _extract_json(raw)
        data = json.loads(extracted)
        quiz = QuizOut.model_validate(data)
    except (JSONDecodeError, ValidationError) as e:
        # One repair attempt
        schema_str = json.dumps(schema, indent=2)
        repair_prompt = f"""
Your previous output was invalid or did not match the required schema.
Fix it and return ONLY valid JSON that matches the schema exactly.
Do NOT return an error object (e.g. {{"error": "..."}});
return the quiz object with keys: topic, difficulty, questions.

Errors:
{str(e)}

JSON Schema (for guidance):
{schema_str}

Previous output:
{raw}
""".strip()
        raw2 = await provider.generate_text(model=model.provider_model, prompt=repair_prompt, temperature=0.0)
        try:
            extracted2 = _extract_json(raw2)
            data2 = json.loads(extracted2)
            quiz = QuizOut.model_validate(data2)
        except (JSONDecodeError, ValidationError) as e2:
            raise ValueError(
                "Model output was not valid quiz JSON (even after a repair attempt). "
                "Try a different model/provider or reduce question count."
            ) from e2

    # Enforce requested count (even if model drifted)
    if len(quiz.questions) != int(request.num_questions):
        raise ValueError(
            f"Model returned {len(quiz.questions)} questions, expected {int(request.num_questions)}"
        )
    quiz.model_id = request.model_id
    return quiz


async def generate_report(request: ReportRequest) -> str:
    model = get_model_option(request.model_id)
    provider = _provider_for(model.provider)

    prompt = build_report_prompt(
        topic=request.topic,
        difficulty=request.difficulty,
        results=request.results,
    )

    # Provider (Gemini) might force JSON, so we handle extraction.
    raw = await provider.generate_text(model=model.provider_model, prompt=prompt, temperature=0.7)
    
    try:
        extracted = _extract_json(raw)
        data = json.loads(extracted)
        return data.get("report", raw)
    except Exception:
        # Fallback if it's not JSON (e.g. other providers)
        return raw
