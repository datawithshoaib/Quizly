"use client";

import { QuizForm } from "@/app/components/QuizForm";
import { QuizViewer } from "@/app/components/QuizViewer";
import type { QuizResponse } from "@/lib/api";
import { useState } from "react";

export default function Page() {
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);

  return quiz ? <QuizViewer quiz={quiz} onReset={() => setQuiz(null)} /> : <QuizForm onGenerated={setQuiz} />;
}
