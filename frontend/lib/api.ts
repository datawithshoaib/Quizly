export type Difficulty = "easy" | "medium" | "hard";

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
};

export type ReportResponse = {
  report: string;
};

export type Provider = "groq" | "openrouter";

export type AppConfig = {
  default_provider: Provider;
  providers: { id: Provider; label: string }[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

// User-entered provider key, kept in memory only and sent with each request.
let userApiKey = "";
let userProvider: Provider = "groq";

export function setApiKey(key: string, provider: Provider): void {
  userApiKey = key.trim();
  userProvider = provider;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(userApiKey ? { "X-API-Key": userApiKey } : {}),
      "X-LLM-Provider": userProvider,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const payload: unknown = await res.json().catch(() => null);
    if (payload && typeof payload === "object" && "detail" in payload) {
      const detail = payload.detail;
      if (typeof detail === "string") throw new Error(detail);
      throw new Error(JSON.stringify(detail));
    }
    throw new Error(`Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function fetchConfig(): Promise<AppConfig> {
  return await http<AppConfig>("/api/config");
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
