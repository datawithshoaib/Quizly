import logging

from fastapi import APIRouter, HTTPException

from app.db import crud
from app.core.models import ModelNotConfiguredError, list_model_options
from app.core.schema import GenerateQuizRequest, QuizResponse, ReportRequest, ReportResponse
from app.core.service import generate_quiz, generate_report


router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/models")
def get_models() -> list[dict]:
    return [m.model_dump() for m in list_model_options()]


@router.post("/quizzes/generate", response_model=QuizResponse)
def generate(request: GenerateQuizRequest) -> QuizResponse:
    try:
        quiz = generate_quiz(request)
    except ModelNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("Quiz generation failed for model %s", request.model_id)
        raise HTTPException(
            status_code=502,
            detail="The selected model could not generate a quiz. Check the provider status and try again.",
        ) from e

    quiz_id = crud.save_quiz(quiz=quiz, model_id=request.model_id)
    return QuizResponse(
        quiz_id=quiz_id,
        topic=quiz.topic,
        difficulty=quiz.difficulty,
        questions=quiz.questions,
        model_id=request.model_id,
    )


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
def get_quiz(quiz_id: int) -> QuizResponse:
    saved = crud.get_quiz(quiz_id)
    if saved is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return saved


@router.post("/quizzes/report", response_model=ReportResponse)
def report(request: ReportRequest) -> ReportResponse:
    try:
        report_text = generate_report(request)
        return ReportResponse(report=report_text)
    except ModelNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("Study report generation failed for model %s", request.model_id)
        raise HTTPException(
            status_code=502,
            detail="The selected model could not generate study notes. Check the provider status and try again.",
        ) from e

