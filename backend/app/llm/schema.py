from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, conint


Difficulty = Literal["easy", "medium", "hard"]


class QuestionOut(BaseModel):
    question: str = Field(min_length=5)
    choices: list[str] = Field(min_length=4, max_length=4)
    answer_index: conint(ge=0, le=3)  # type: ignore[valid-type]
    explanation: str = Field(min_length=0, default="")


class QuizOut(BaseModel):
    topic: str
    difficulty: Difficulty
    questions: list[QuestionOut]
    model_id: str


class GenerateQuizRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=200)
    difficulty: Difficulty
    num_questions: conint(ge=1, le=25)  # type: ignore[valid-type]
    model_id: str = Field(min_length=1)


class QuizResponse(BaseModel):
    quiz_id: int
    topic: str
    difficulty: Difficulty
    questions: list[QuestionOut]
    model_id: str


class ReportRequest(BaseModel):
    topic: str
    difficulty: Difficulty
    results: list[dict]  # Simplified; list of {question, selected, correct}
    model_id: str


class ReportResponse(BaseModel):
    report: str

