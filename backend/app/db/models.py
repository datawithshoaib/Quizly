from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class Quiz(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    topic: str
    difficulty: str
    model_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    quiz_id: int = Field(foreign_key="quiz.id", index=True)
    position: int = Field(index=True)

    question: str
    choices_json: str
    answer_index: int
    explanation: str = ""

