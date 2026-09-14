from fastapi import APIRouter, HTTPException

from app.db import crud
from app.llm.registry import list_model_options
from app.llm.service import generate_quiz, generate_report
from app.llm.schema import GenerateQuizRequest, QuizResponse, ReportRequest, ReportResponse


router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/models")
def get_models() -> list[dict]:
    return [m.model_dump() for m in list_model_options()]


@router.post("/quizzes/generate", response_model=QuizResponse)
async def generate(request: GenerateQuizRequest) -> QuizResponse:
    try:
        quiz = await generate_quiz(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}") from e

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
async def report(request: ReportRequest) -> ReportResponse:
    try:
        report_text = await generate_report(request)
        return ReportResponse(report=report_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {e}") from e

