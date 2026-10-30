"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { QuizResponse } from "@/lib/api";
import { generateReport } from "@/lib/api";
import { ArrowLeft, ArrowRight, Check, CircleCheck, CircleX, Download, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

export function QuizViewer({ quiz, onReset }: { quiz: QuizResponse; onReset: () => void }) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const allAnswered = quiz.questions.length > 0 && Object.keys(selectedAnswers).length === quiz.questions.length;
  const score = useMemo(() => quiz.questions.reduce((total, question, index) => total + Number(selectedAnswers[index] === question.answer_index), 0), [quiz.questions, selectedAnswers]);

  async function onFinish() {
    setFinished(true);
    setReportLoading(true);
    try {
      const results = quiz.questions.map((question, index) => ({
        question: question.question,
        selected: question.choices[selectedAnswers[index]],
        correct: question.choices[question.answer_index],
        is_correct: selectedAnswers[index] === question.answer_index,
      }));
      setReport((await generateReport({ topic: quiz.topic, difficulty: quiz.difficulty, results })).report);
    } catch {
      setReport("Your score is ready, but we couldn't create the study notes. You can still review every answer above.");
    } finally {
      setReportLoading(false);
    }
  }

  function downloadQuiz() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(quiz, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quiz-${quiz.quiz_id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={onReset} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"><ArrowLeft size={16} /> Back to quiz setup</button>
      <Card className="mb-5 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-[#111b3f] px-6 py-6 text-white sm:px-8 sm:py-7">
          <div><div className="mb-3 flex flex-wrap gap-2"><Badge className="border-white/15 bg-white/10 text-blue-50 capitalize">{quiz.difficulty} level</Badge><Badge className="border-white/15 bg-white/10 text-blue-50">{quiz.questions.length} questions</Badge></div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{quiz.topic}</h1><p className="mt-2 text-sm text-blue-100/70">Take your time. Your answer is saved as soon as you choose it.</p></div>
          <Button variant="outline" size="sm" onClick={downloadQuiz} className="border-white/20 bg-white text-slate-900 hover:bg-blue-50"><Download size={15} /> Save quiz</Button>
        </div>
        <CardContent className="grid gap-4 p-4 sm:p-6">
          {quiz.questions.map((question, index) => {
            const selected = selectedAnswers[index];
            const answered = selected !== undefined;
            const correct = selected === question.answer_index;
            return (
              <section key={`${index}-${question.question}`} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="mb-4 flex items-start gap-3"><span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-blue-50 px-2 text-xs font-bold text-blue-700">{String(index + 1).padStart(2, "0")}</span><div className="flex-1 pt-0.5 text-[15px] font-semibold leading-6 text-slate-900">{question.question}</div>{answered && (correct ? <CircleCheck className="shrink-0 text-emerald-500" size={19} /> : <CircleX className="shrink-0 text-rose-500" size={19} />)}</div>
                <div className="grid gap-2 pl-10">
                  {question.choices.map((choice, choiceIndex) => {
                    const isSelected = selected === choiceIndex;
                    const isAnswer = answered && choiceIndex === question.answer_index;
                    const style = isAnswer ? "border-emerald-300 bg-emerald-50 text-emerald-900" : isSelected ? "border-rose-300 bg-rose-50 text-rose-900" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/50";
                    return <button key={choiceIndex} type="button" disabled={answered} onClick={() => setSelectedAnswers((previous) => ({ ...previous, [index]: choiceIndex }))} className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition disabled:cursor-default ${style}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${isAnswer ? "border-emerald-300 bg-white text-emerald-700" : "border-current/20"}`}>{String.fromCharCode(65 + choiceIndex)}</span><span className="flex-1 leading-5">{choice}</span>{isAnswer && <Check size={16} className="text-emerald-600" />}</button>;
                  })}
                </div>
                {answered && <div className="ml-10 mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-800">Why: </span>{question.explanation || "Review the correct answer and keep practicing."}</div>}
              </section>
            );
          })}
          {!finished && <div className="flex flex-col items-center gap-2 pt-2"><Button size="lg" disabled={!allAnswered} onClick={onFinish}>See my results <ArrowRight size={17} /></Button>{!allAnswered && <span className="text-xs text-slate-400">Answer all {quiz.questions.length} questions to finish</span>}</div>}
        </CardContent>
      </Card>

      {finished && <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-8 text-center text-white sm:px-10 sm:py-10">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Sparkles size={23} /></span>
          <p className="text-sm font-medium text-blue-100">Quiz complete</p>
          <h2 className="mt-1 text-3xl font-bold">{score}<span className="text-xl font-medium text-blue-200"> / {quiz.questions.length}</span></h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-blue-100">{score === quiz.questions.length ? "A perfect run. You really know your stuff." : score > quiz.questions.length / 2 ? "Nice work. A little review will make these ideas stick." : "Every question is a chance to learn. Review the explanations and try again."}</p>
        </div>
        <CardContent className="p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Sparkles size={16} /></span><h3 className="font-semibold text-slate-900">Your study notes</h3></div>
          {reportLoading ? <div className="flex items-center gap-2 py-4 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin text-blue-600" /> Putting together your personalized review…</div> : report && <div className="prose prose-slate prose-sm max-w-none leading-7"><ReactMarkdown>{report}</ReactMarkdown></div>}
          <Button variant="outline" onClick={onReset} className="mt-6 w-full sm:w-auto"><RotateCcw size={16} /> Create another quiz</Button>
        </CardContent>
      </Card>}
    </div>
  );
}
