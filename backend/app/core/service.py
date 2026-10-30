from __future__ import annotations

import json
import re
from json import JSONDecodeError
from typing import Any, TypedDict

from langchain_core.messages import BaseMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda
from langgraph.graph import END, START, StateGraph
from pydantic import ValidationError

from app.core.models import LanguageModel, create_model, get_configured_model_option
from app.core.prompt import (
    build_quiz_prompt,
    build_repair_prompt,
    build_report_input,
    build_report_prompt,
)
from app.core.schema import GenerateQuizRequest, QuizContent, QuizOut, ReportRequest


class QuizGenerationState(TypedDict, total=False):
    model: LanguageModel
    topic: str
    difficulty: str
    num_questions: int
    schema_json: str
    raw_output: str
    attempt: int
    validation_error: str
    quiz: QuizContent


def _message_text(value: BaseMessage | str) -> str:
    """Normalize provider message content, including Gemini content blocks."""
    if isinstance(value, str):
        return value
    content = value.content
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            str(block["text"])
            for block in content
            if isinstance(block, dict) and isinstance(block.get("text"), str)
        )
    return str(content)


def _parse_json_object(text: str) -> dict[str, Any]:
    content = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)\s*```", content, flags=re.IGNORECASE | re.DOTALL)
    if fenced:
        content = fenced.group(1)
    else:
        start, end = content.find("{"), content.rfind("}")
        if start < 0 or end <= start:
            raise JSONDecodeError("No JSON object found in model output", content, 0)
        content = content[start : end + 1]
    data = json.loads(content)
    if not isinstance(data, dict):
        raise ValueError("Model output must be a JSON object")
    return data


def _build_quiz_graph():
    to_text = RunnableLambda(_message_text) | StrOutputParser()

    def generate(state: QuizGenerationState) -> dict[str, str]:
        chain = build_quiz_prompt() | state["model"] | to_text
        output = chain.invoke(
            {
                "topic": state["topic"],
                "difficulty": state["difficulty"],
                "num_questions": state["num_questions"],
                "schema_json": state["schema_json"],
            }
        )
        return {"raw_output": output}

    def validate(state: QuizGenerationState) -> dict[str, Any]:
        try:
            data = _parse_json_object(state["raw_output"])
            quiz = QuizContent.model_validate(data)
            expected_count = state["num_questions"]
            if len(quiz.questions) != expected_count:
                raise ValueError(
                    f"Model returned {len(quiz.questions)} questions; expected {expected_count}."
                )
            return {"quiz": quiz, "validation_error": ""}
        except (JSONDecodeError, ValidationError, ValueError) as error:
            return {"validation_error": str(error)}

    def repair(state: QuizGenerationState) -> dict[str, Any]:
        chain = build_repair_prompt() | state["model"] | to_text
        output = chain.invoke(
            {
                "topic": state["topic"],
                "difficulty": state["difficulty"],
                "num_questions": state["num_questions"],
                "schema_json": state["schema_json"],
                "validation_error": state["validation_error"],
                "previous_output": state["raw_output"],
            }
        )
        return {"raw_output": output, "attempt": state.get("attempt", 0) + 1}

    def route_after_validation(state: QuizGenerationState) -> str:
        if state.get("quiz"):
            return END
        return "repair" if state.get("attempt", 0) < 1 else END

    graph = StateGraph(QuizGenerationState)
    graph.add_node("generate", generate)
    graph.add_node("validate", validate)
    graph.add_node("repair", repair)
    graph.add_edge(START, "generate")
    graph.add_edge("generate", "validate")
    graph.add_conditional_edges("validate", route_after_validation)
    graph.add_edge("repair", "validate")
    return graph.compile()


quiz_generation_graph = _build_quiz_graph()


def generate_quiz(request: GenerateQuizRequest, *, api_key: str | None = None) -> QuizOut:
    option = get_configured_model_option()
    schema_json = json.dumps(QuizContent.model_json_schema(), indent=2)
    state = quiz_generation_graph.invoke(
        {
            "model": create_model(option, temperature=0.0, api_key=api_key),
            "topic": request.topic,
            "difficulty": request.difficulty,
            "num_questions": request.num_questions,
            "schema_json": schema_json,
            "attempt": 0,
        }
    )
    quiz = state.get("quiz")
    if quiz is None:
        raise ValueError(
            "The AI model returned an invalid quiz after one repair attempt. "
            "Try again or reduce the question count."
        )

    return QuizOut(
        topic=request.topic,
        difficulty=request.difficulty,
        questions=quiz.questions,
        model_id=option.id,
    )


def generate_report(request: ReportRequest, *, api_key: str | None = None) -> str:
    option = get_configured_model_option()
    chain = (
        build_report_prompt()
        | create_model(option, temperature=0.5, api_key=api_key)
        | RunnableLambda(_message_text)
        | StrOutputParser()
    )
    prompt_values = build_report_input(
        topic=request.topic,
        difficulty=request.difficulty,
        results=[result.model_dump() for result in request.results],
    )
    return chain.invoke(prompt_values)
