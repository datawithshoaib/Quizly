from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate


def build_quiz_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an expert quiz writer. Return one valid JSON object only, with no markdown or commentary. "
                "Write clear, unambiguous multiple-choice questions with exactly four choices each. "
                "The answer_index is zero-based and must identify the correct choice. "
                "Follow this JSON schema exactly:\n{schema_json}",
            ),
            (
                "human",
                "Create a {difficulty} quiz about: {topic}\n"
                "Write exactly {num_questions} questions. Include a short explanation for each answer.",
            ),
        ]
    )


def build_repair_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Repair the quiz output. Return only one valid JSON object matching this schema, with no markdown:\n"
                "{schema_json}",
            ),
            (
                "human",
                "The output should contain exactly {num_questions} questions about {topic} at {difficulty} difficulty. "
                "Validation error:\n{validation_error}\n\nPrevious output:\n{previous_output}",
            ),
        ]
    )


def build_report_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an encouraging, precise tutor. Analyze quiz performance and write a concise, useful study report. "
                "Use Markdown headings and bullets. Return the report itself, not JSON.",
            ),
            (
                "human",
                "Quiz topic: {topic}\nDifficulty: {difficulty}\nScore: {score}\n\n"
                "Answer review:\n{answer_review}\n\n"
                "Explain patterns in missed concepts and suggest concrete next steps. Avoid claiming a student missed a concept "
                "unless the answer review supports that conclusion.",
            ),
        ]
    )


def build_report_input(
    *, topic: str, difficulty: str, results: list[dict[str, object]]
) -> dict[str, str]:
    correct_count = sum(bool(result.get("is_correct")) for result in results)
    review_lines = []
    for index, result in enumerate(results, start=1):
        status = "Correct" if result.get("is_correct") else "Incorrect"
        review_lines.append(
            f"{index}. {status}\n"
            f"Question: {result.get('question', '')}\n"
            f"Selected: {result.get('selected', '')}\n"
            f"Correct answer: {result.get('correct', '')}"
        )

    return {
        "topic": topic,
        "difficulty": difficulty,
        "score": f"{correct_count}/{len(results)}",
        "answer_review": "\n\n".join(review_lines) or "No answers were submitted.",
    }
