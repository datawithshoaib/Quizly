import type { QuizResponse, ReportResponse } from "@/lib/api";
import { generateReport } from "@/lib/api";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

export function QuizViewer({ quiz, onReset }: { quiz: QuizResponse; onReset: () => void }) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  // If a key exists in selectedAnswers, it is considered "answered" and locked.

  const [finished, setFinished] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const jsonBlobUrl = useMemo(() => {
    const blob = new Blob([JSON.stringify(quiz, null, 2)], { type: "application/json" });
    return URL.createObjectURL(blob);
  }, [quiz]);

  const allAnswered = quiz.questions.length > 0 && Object.keys(selectedAnswers).length === quiz.questions.length;
  const score = quiz.questions.reduce((acc, q, idx) => {
    return acc + (selectedAnswers[idx] === q.answer_index ? 1 : 0);
  }, 0);

  async function onFinish() {
    setFinished(true);
    setReportLoading(true);
    try {
      const results = quiz.questions.map((q, idx) => ({
        question: q.question,
        selected: q.choices[selectedAnswers[idx]],
        correct: q.choices[q.answer_index],
        is_correct: selectedAnswers[idx] === q.answer_index
      }));

      const rep = await generateReport({
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        results,
        model_id: quiz.model_id
      });
      setReport(rep.report);
    } catch (e) {
      console.error(e);
      setReport("Failed to generate report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{quiz.topic}</div>
          <div className="muted">
            <span className="pill">Difficulty: {quiz.difficulty}</span>{" "}
            <span className="pill">Questions: {quiz.questions.length}</span>{" "}
            <span className="pill">Quiz ID: {quiz.quiz_id}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href={jsonBlobUrl} download={`quiz-${quiz.quiz_id}.json`} className="pill">
            Download JSON
          </a>
        </div>
      </div>

      {!finished ? (
        <div style={{ display: "grid", gap: 12 }}>
          {quiz.questions.map((q, idx) => {
            const hasAnswered = selectedAnswers[idx] !== undefined;
            const isCorrect = selectedAnswers[idx] === q.answer_index;

            return (
              <div key={idx} className="card q">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Q{idx + 1}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 650 }}>{q.question}</div>
                  </div>
                  {hasAnswered && (
                    <div style={{ fontWeight: "bold", color: isCorrect ? "green" : "red" }}>
                      {isCorrect ? "Correct" : "Incorrect"}
                    </div>
                  )}
                </div>

                <div className="choices">
                  {q.choices.map((c, cidx) => {
                    const isSelected = selectedAnswers[idx] === cidx;
                    const isAnswer = hasAnswered && cidx === q.answer_index;

                    let className = "choice";
                    if (isSelected) className += " selected";
                    if (isAnswer) className += " answer"; // Show correct answer if answered
                    if (hasAnswered && isSelected && !isCorrect) className += " error"; // Highlight selected wrong answer

                    return (
                      <div
                        key={cidx}
                        className={className}
                        role="button"
                        tabIndex={hasAnswered ? -1 : 0}
                        aria-pressed={isSelected}
                        onClick={() => {
                          if (!hasAnswered) setSelectedAnswers((prev) => ({ ...prev, [idx]: cidx }));
                        }}
                        style={{ cursor: hasAnswered ? "default" : "pointer" }}
                      >
                        <strong style={{ marginRight: 10 }}>{String.fromCharCode(65 + cidx)}.</strong>
                        {c}
                      </div>
                    );
                  })}
                </div>

                {hasAnswered && (
                  <div className="muted" style={{ marginTop: 10 }}>
                    <strong>Explanation:</strong> {q.explanation || "(none)"}
                  </div>
                )}
              </div>
            );
          })}

          {allAnswered && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <button onClick={onFinish} style={{ fontSize: 16, padding: "10px 20px" }}>
                Finish Quiz & View Results
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <h2>Quiz Completed!</h2>
            <div style={{ fontSize: 24, fontWeight: "bold" }}>
              Score: {score} / {quiz.questions.length}
            </div>
            <div className="muted" style={{ marginTop: 10 }}>
              {score === quiz.questions.length
                ? "Perfect score! You're a wizard! 🧙‍♂️"
                : score > quiz.questions.length / 2
                  ? "Great job! Keep learning and you'll get them all next time! 🚀"
                  : "Don't worry, every mistake is a learning opportunity! You got this! 💪"}
            </div>
          </div>

          {reportLoading && <div>Generating improvement report...</div>}

          {report && (
            <div className="card">
              <h3>Quizly Tip</h3>
              <div className="markdown-body">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </div>
          )}

          <button onClick={onReset} style={{ alignSelf: "center" }}>
            Start New Quiz
          </button>
        </div>
      )}
    </div>
  );
}
