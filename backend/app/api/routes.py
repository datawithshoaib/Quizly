import logging

from typing import Annotated

from fastapi import APIRouter, Header, HTTPException

from app.db import crud
from app.core.models import (
    PROVIDER_LABELS,
    ModelNotConfiguredError,
    get_configured_model_option,
    has_server_api_key,
)
from app.core.schema import GenerateQuizRequest, QuizResponse, ReportRequest, ReportResponse
from app.core.service import generate_quiz, generate_report


router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

# Optional user-supplied provider key; used for that request only, never stored.
ApiKeyHeader = Annotated[str | None, Header(alias="X-API-Key")]


def _is_auth_error(error: BaseException) -> bool:
    """Whether a provider SDK error (or one it wraps) is a 401/403 rejection."""
    while error is not None:
        status = getattr(error, "status_code", None) or getattr(error, "code", None)
        if status in (401, 403):
            return True
        error = error.__cause__ or error.__context__
    return False


def _auth_error_detail() -> str:
    provider = PROVIDER_LABELS.get(get_configured_model_option().provider, "provider")
    return (
        f"{provider} rejected the API key. Check that it is a valid {provider} key, "
        "without quotes or extra spaces, in the form or your .env file."
    )


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/config")
def get_config() -> dict:
    option = get_configured_model_option()
    return {
        "provider": option.provider,
        "provider_label": PROVIDER_LABELS.get(option.provider, option.provider),
        "server_api_key_configured": has_server_api_key(option),
    }


@router.post("/quizzes/generate", response_model=QuizResponse)
def generate(request: GenerateQuizRequest, x_api_key: ApiKeyHeader = None) -> QuizResponse:
    try:
        quiz = generate_quiz(request, api_key=x_api_key or None)
    except ModelNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        if _is_auth_error(e):
            raise HTTPException(status_code=401, detail=_auth_error_detail()) from e
        logger.exception("Quiz generation failed for topic %r", request.topic)
        raise HTTPException(
            status_code=502,
            detail="The AI model could not generate a quiz. Check the provider status and try again.",
        ) from e

    quiz_id = crud.save_quiz(quiz=quiz, model_id=quiz.model_id)
    return QuizResponse(
        quiz_id=quiz_id,
        topic=quiz.topic,
        difficulty=quiz.difficulty,
        questions=quiz.questions,
        model_id=quiz.model_id,
    )


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
def get_quiz(quiz_id: int) -> QuizResponse:
    saved = crud.get_quiz(quiz_id)
    if saved is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return saved


@router.post("/quizzes/report", response_model=ReportResponse)
def report(request: ReportRequest, x_api_key: ApiKeyHeader = None) -> ReportResponse:
    try:
        report_text = generate_report(request, api_key=x_api_key or None)
        return ReportResponse(report=report_text)
    except ModelNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        if _is_auth_error(e):
            raise HTTPException(status_code=401, detail=_auth_error_detail()) from e
        logger.exception("Study report generation failed for topic %r", request.topic)
        raise HTTPException(
            status_code=502,
            detail="The AI model could not generate study notes. Check the provider status and try again.",
        ) from e

