export type Difficulty = "easy" | "medium" | "hard";

export type ModelOption = {
  id: string;
  provider: string;
  label: string;
  provider_model: string;
  supports_json: boolean;
};

export type Question = {
  question: string;
  choices: string[];
  answer_index: number;
  explanation: string;
};

export type QuizResponse = {
  quiz_id: number;
  topic: string;
  difficulty: Difficulty;
  questions: Question[];
  model_id: string;
};

export type GenerateQuizRequest = {
  topic: string;
  difficulty: Difficulty;
  num_questions: number;
  model_id: string;
};

export type ReportRequest = {
  topic: string;
  difficulty: Difficulty;
  results: {
    question: string;
    selected: string;
    correct: string;
    is_correct: boolean;
  }[];
  model_id: string;
};

export type ReportResponse = {
  report: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function fetchModels(): Promise<ModelOption[]> {
  return await http<ModelOption[]>("/api/models");
}

export async function generateQuiz(body: GenerateQuizRequest): Promise<QuizResponse> {
  return await http<QuizResponse>("/api/quizzes/generate", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function generateReport(body: ReportRequest): Promise<ReportResponse> {
  return await http<ReportResponse>("/api/quizzes/report", {
    method: "POST",
    body: JSON.stringify(body)
  });
}
