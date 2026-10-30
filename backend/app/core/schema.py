from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Difficulty = Literal["easy", "medium", "hard"]


class QuestionOut(BaseModel):
    question: str = Field(min_length=5)
    choices: list[str] = Field(min_length=4, max_length=4)
    answer_index: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=0, default="")


class QuizContent(BaseModel):
    topic: str
    difficulty: Difficulty
    questions: list[QuestionOut]


class QuizOut(QuizContent):
    model_id: str = ""


class GenerateQuizRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=200)
    difficulty: Difficulty
    num_questions: int = Field(ge=1, le=25)


class QuizResponse(BaseModel):
    quiz_id: int
    topic: str
    difficulty: Difficulty
    questions: list[QuestionOut]
    model_id: str


class ReportAnswer(BaseModel):
    question: str
    selected: str
    correct: str
    is_correct: bool


class ReportRequest(BaseModel):
    topic: str
    difficulty: Difficulty
    results: list[ReportAnswer]


class ReportResponse(BaseModel):
    report: str

