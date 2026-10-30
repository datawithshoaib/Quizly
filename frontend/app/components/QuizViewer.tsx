"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Question, QuizResponse } from "@/lib/api";
import { generateReport } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, CircleCheck, CircleX, Download, Lightbulb, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

type Answers = Record<number, number>;

export function QuizViewer({ quiz, onReset }: { quiz: QuizResponse; onReset: () => void }) {
  const [selectedAnswers, setSelectedAnswers] = useState<Answers>({});
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const total = quiz.questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = total > 0 && answeredCount === total;
  const score = useMemo(() => quiz.questions.reduce((sum, question, index) => sum + Number(selectedAnswers[index] === question.answer_index), 0), [quiz.questions, selectedAnswers]);

  const choose = useCallback((questionIndex: number, choiceIndex: number) => {
    setSelectedAnswers((previous) => (questionIndex in previous ? previous : { ...previous, [questionIndex]: choiceIndex }));
  }, []);

  useEffect(() => {
    if (finished) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const question = quiz.questions[current];
      const key = event.key.toLowerCase();
      const choiceIndex = /^[1-9]$/.test(key) ? Number(key) - 1 : /^[a-z]$/.test(key) ? key.charCodeAt(0) - 97 : -1;
      if (choiceIndex >= 0 && choiceIndex < question.choices.length) choose(current, choiceIndex);
      else if (event.key === "ArrowRight") setCurrent((index) => Math.min(index + 1, total - 1));
      else if (event.key === "ArrowLeft") setCurrent((index) => Math.max(index - 1, 0));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, finished, quiz.questions, total, choose]);

  async function onFinish() {
    setFinished(true);
    setReportLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const results = quiz.questions.map((question, index) => ({
        question: question.question,
        selected: question.choices[selectedAnswers[index]],
        correct: question.choices[question.answer_index],
        is_correct: selectedAnswers[index] === question.answer_index,
      }));
      setReport((await generateReport({ topic: quiz.topic, difficulty: quiz.difficulty, results })).report);
    } catch {
      setReport("Your score is ready, but we couldn't create the study notes. You can still review every answer below.");
    } finally {
      setReportLoading(false);
    }
  }

  function retake() {
    setSelectedAnswers({});
    setCurrent(0);
    setFinished(false);
    setReport(null);
  }

  function downloadQuiz() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(quiz, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quiz-${quiz.quiz_id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const question = quiz.questions[current];
  const isLast = current === total - 1;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onReset} className="-ml-3 text-muted-foreground">
          <ArrowLeft /> New quiz
        </Button>
        <Button variant="outline" size="sm" onClick={downloadQuiz}>
          <Download /> Save quiz
        </Button>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="soft" className="capitalize">{quiz.difficulty}</Badge>
          <Badge variant="secondary">{total} questions</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{quiz.topic}</h1>
      </div>

      {finished ? (
        <Results quiz={quiz} answers={selectedAnswers} score={score} report={report} reportLoading={reportLoading} onRetake={retake} onReset={onReset} />
      ) : (
        <>
          <div className="mb-4 grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Question {current + 1} <span className="text-muted-foreground">of {total}</span></span>
              <span className="text-muted-foreground">{answeredCount} answered</span>
            </div>
            <Progress value={(answeredCount / Math.max(total, 1)) * 100} />
          </div>

          <QuestionCard key={current} question={question} index={current} selected={selectedAnswers[current]} onChoose={(choiceIndex) => choose(current, choiceIndex)} />

          <div className="mt-5 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrent((index) => index - 1)} disabled={current === 0}>
              <ArrowLeft /> Previous
            </Button>
            {isLast ? (
              <Button onClick={onFinish} disabled={!allAnswered}>
                See my results <Trophy />
              </Button>
            ) : (
              <Button onClick={() => setCurrent((index) => index + 1)} variant={selectedAnswers[current] === undefined ? "outline" : "default"}>
                Next <ArrowRight />
              </Button>
            )}
          </div>

          <Card className="mt-8">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Jump to question</p>
                {!allAnswered && <p className="text-xs text-muted-foreground">Answer all {total} to finish</p>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quiz.questions.map((item, index) => {
                  const answer = selectedAnswers[index];
                  const status = answer === undefined ? "open" : answer === item.answer_index ? "right" : "wrong";
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCurrent(index)}
                      aria-label={`Question ${index + 1}`}
                      aria-current={index === current}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md border text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        status === "open" && "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        status === "right" && "border-success/40 bg-success/10 text-success",
                        status === "wrong" && "border-destructive/40 bg-destructive/10 text-destructive",
                        index === current && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      )}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 hidden text-xs text-muted-foreground sm:block">
                Tip: press <Kbd>A</Kbd>–<Kbd>D</Kbd> to answer and <Kbd>←</Kbd> <Kbd>→</Kbd> to move between questions.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function QuestionCard({ question, index, selected, onChoose }: { question: Question; index: number; selected: number | undefined; onChoose: (choiceIndex: number) => void }) {
  const answered = selected !== undefined;
  const correct = selected === question.answer_index;

  return (
    <Card className="animate-fade-up overflow-hidden">
      <CardHeader className="gap-3 pb-5">
        <span className="font-mono text-xs font-medium text-primary">Q{String(index + 1).padStart(2, "0")}</span>
        <CardTitle className="text-lg font-semibold leading-snug sm:text-xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2.5">
        {question.choices.map((choice, choiceIndex) => {
          const isSelected = selected === choiceIndex;
          const isAnswer = answered && choiceIndex === question.answer_index;
          const isWrongPick = isSelected && !isAnswer;
          return (
            <button
              key={choiceIndex}
              type="button"
              disabled={answered}
              onClick={() => onChoose(choiceIndex)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg border px-4 py-3.5 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                !answered && "hover:border-primary/50 hover:bg-accent/60",
                isAnswer && "border-success/50 bg-success/10",
                isWrongPick && "border-destructive/50 bg-destructive/10",
                answered && !isAnswer && !isWrongPick && "opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-semibold text-muted-foreground transition-colors",
                  !answered && "group-hover:border-primary/50 group-hover:text-primary",
                  isAnswer && "border-success bg-success text-success-foreground",
                  isWrongPick && "border-destructive bg-destructive text-destructive-foreground"
                )}
              >
                {isAnswer ? <Check className="size-4" /> : isWrongPick ? <X className="size-4" /> : String.fromCharCode(65 + choiceIndex)}
              </span>
              <span className="flex-1 leading-relaxed">{choice}</span>
            </button>
          );
        })}

        {answered && (
          <div className={cn("mt-3 animate-fade-up rounded-lg border p-4", correct ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}>
            <p className={cn("mb-1.5 flex items-center gap-2 text-sm font-semibold", correct ? "text-success" : "text-destructive")}>
              {correct ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />}
              {correct ? "Correct!" : "Not quite"}
            </p>
            <p className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{question.explanation || "Review the correct answer and keep practicing."}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Results({ quiz, answers, score, report, reportLoading, onRetake, onReset }: { quiz: QuizResponse; answers: Answers; score: number; report: string | null; reportLoading: boolean; onRetake: () => void; onReset: () => void }) {
  const total = quiz.questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;
  const message = score === total ? "A perfect run. You really know your stuff." : score > total / 2 ? "Nice work. A little review will make these ideas stick." : "Every question is a chance to learn. Review the explanations and try again.";

  return (
    <div className="grid gap-6 animate-fade-up">
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:p-8">
          <ScoreRing percent={percent} />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-medium text-muted-foreground">Quiz complete</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {score} <span className="text-lg font-normal text-muted-foreground">/ {total} correct</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button onClick={onReset}><Sparkles /> Create another quiz</Button>
              <Button variant="outline" onClick={onRetake}><RotateCcw /> Retake</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground"><Sparkles className="size-4" /></span>
            Your study notes
          </CardTitle>
          <CardDescription>A personalized review based on your answers.</CardDescription>
        </CardHeader>
        <CardContent>
          {reportLoading ? (
            <div className="grid gap-2.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : report && (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Answer review</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-0 p-0">
          {quiz.questions.map((question, index) => {
            const correct = answers[index] === question.answer_index;
            return (
              <div key={`${index}-${question.question}`}>
                <Separator />
                <div className="flex gap-3 px-6 py-4">
                  {correct ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" /> : <CircleX className="mt-0.5 size-5 shrink-0 text-destructive" />}
                  <div className="grid gap-1 text-sm">
                    <p className="font-medium leading-snug">{question.question}</p>
                    {!correct && <p className="text-muted-foreground">Your answer: <span className="text-destructive line-through decoration-destructive/40">{question.choices[answers[index]]}</span></p>}
                    <p className="text-muted-foreground">Correct: <span className="font-medium text-success">{question.choices[question.answer_index]}</span></p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreRing({ percent }: { percent: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="60" cy="60" r={radius} fill="none" strokeWidth="10" strokeLinecap="round"
          className={cn("transition-[stroke-dashoffset] duration-1000 ease-out", percent >= 50 ? "stroke-success" : "stroke-primary")}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">{percent}%</span>
        <span className="text-xs text-muted-foreground">score</span>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium">{children}</kbd>;
}
