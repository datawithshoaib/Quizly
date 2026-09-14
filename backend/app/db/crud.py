from __future__ import annotations

import json

from sqlmodel import Session, select

from app.db.models import Question, Quiz
from app.db.session import engine
from app.llm.schema import QuestionOut, QuizOut, QuizResponse


def save_quiz(*, quiz: QuizOut, model_id: str) -> int:
    with Session(engine) as session:
        quiz_row = Quiz(topic=quiz.topic, difficulty=quiz.difficulty, model_id=model_id)
        session.add(quiz_row)
        session.commit()
        session.refresh(quiz_row)

        for idx, q in enumerate(quiz.questions):
            q_row = Question(
                quiz_id=int(quiz_row.id),
                position=idx,
                question=q.question,
                choices_json=json.dumps(q.choices, ensure_ascii=False),
                answer_index=int(q.answer_index),
                explanation=q.explanation or "",
            )
            session.add(q_row)

        session.commit()
        return int(quiz_row.id)


def get_quiz(quiz_id: int) -> QuizResponse | None:
    with Session(engine) as session:
        quiz_row = session.get(Quiz, quiz_id)
        if quiz_row is None:
            return None

        question_rows = session.exec(
            select(Question).where(Question.quiz_id == quiz_id).order_by(Question.position.asc())
        ).all()

        questions: list[QuestionOut] = []
        for q in question_rows:
            questions.append(
                QuestionOut(
                    question=q.question,
                    choices=json.loads(q.choices_json),
                    answer_index=q.answer_index,
                    explanation=q.explanation,
                )
            )

        return QuizResponse(
            quiz_id=int(quiz_row.id),
            topic=quiz_row.topic,
            difficulty=quiz_row.difficulty,  # type: ignore[arg-type]
            questions=questions,
            model_id=quiz_row.model_id,
        )

