from __future__ import annotations

import json


def build_quiz_prompt(*, topic: str, difficulty: str, num_questions: int, schema: dict) -> str:
    schema_str = json.dumps(schema, indent=2)
    return f"""
Generate a multiple-choice quiz as STRICT JSON ONLY. No markdown, no extra text.

Topic: {topic}
Difficulty: {difficulty}
Number of questions: {num_questions}

Rules:
- Output MUST be valid JSON.
- `questions` length MUST equal Number of questions.
- Each question must have 4 choices.
- `answer_index` must be 0-3 and correspond to the correct choice.
- Keep questions unambiguous, avoid trick questions.

JSON Schema (for guidance):
{schema_str}
""".strip()


def build_report_prompt(*, topic: str, difficulty: str, results: list[dict]) -> str:
    # Summarize results
    correct_count = sum(1 for r in results if r["is_correct"])
    total = len(results)
    
    details = []
    for i, r in enumerate(results):
        status = "Correct" if r["is_correct"] else "Incorrect"
        details.append(f"Q{i+1}: {status}\nQuestion: {r['question']}\nSelected: {r['selected']}\nCorrect Answer: {r['correct']}")
    
    details_str = "\n\n".join(details)

    return f"""
You are an expert tutor. The user just took a quiz on "{topic}" (Difficulty: {difficulty}).
Score: {correct_count}/{total}

Here are the details of their performance:
{details_str}

Please generate a constructive improvement report.
1. Analyze their mistakes.
2. Explain the core concepts they missed.
3. Suggest specific areas to focus on for improvement.
4. Keep the tone encouraging but educational.
5. Use Markdown for formatting (bold, lists, etc.).

IMPORTANT: Return the output as STRICT JSON with a single key "report" containing the markdown string.
Example:
{{
  "report": "# Analysis\\n\\n..."
}}
""".strip()
