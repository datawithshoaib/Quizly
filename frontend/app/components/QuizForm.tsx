"use client";

import type { Difficulty, GenerateQuizRequest, ModelOption, QuizResponse } from "@/lib/api";
import { fetchModels, generateQuiz } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

type Props = {
  onGenerated: (quiz: QuizResponse) => void;
};

function providerLabel(provider: string): string {
  switch (provider) {
    case "openrouter":
      return "OpenRouter";
    case "gemini":
      return "Gemini";
    case "deepseek":
      return "DeepSeek";
    case "huggingface":
      return "HuggingFace";
    default:
      return provider;
  }
}

export function QuizForm({ onGenerated }: Props) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelId, setModelId] = useState<string>("");
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadModels() {
    setModelsLoading(true);
    setError(null);
    const m = await fetchModels();
    setModels(m);
    setModelId((prev) => (m.some((x) => x.id === prev) ? prev : m[0]?.id ?? ""));
    setModelsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    setModelsLoading(true);
    fetchModels()
      .then((m) => {
        if (cancelled) return;
        setModels(m);
        setModelId((prev) => (m.some((x) => x.id === prev) ? prev : m[0]?.id ?? ""));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (cancelled) return;
        setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const modelsByProvider = useMemo(() => {
    const groups: Record<string, ModelOption[]> = {};
    for (const m of models) {
      (groups[m.provider] ??= []).push(m);
    }
    // Stable ordering: by provider name, then by label.
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.label.localeCompare(b.label));
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [models]);

  const canSubmit = useMemo(() => {
    return topic.trim().length >= 2 && numQuestions >= 1 && numQuestions <= 25 && modelId.length > 0;
  }, [topic, numQuestions, modelId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: GenerateQuizRequest = {
        topic: topic.trim(),
        difficulty,
        num_questions: numQuestions,
        model_id: modelId
      };
      const quiz = await generateQuiz(body);
      onGenerated(quiz);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Quizly</div>
        <div className="muted">
          Generate quizzes for a topic using your selected LLM provider
        </div>
      </div>

      <div>
        <label>Topic</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Operating Systems, React hooks, World War II..."
        />
      </div>

      <div className="row3">
        <div>
          <label>Model</label>
          <div style={{ display: "grid", gap: 6 }}>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={modelsLoading || models.length === 0}
            >
              {modelsLoading ? (
                <option value="">Loading models...</option>
              ) : models.length === 0 ? (
                <option value="">No models available</option>
              ) : (
                modelsByProvider.map(([provider, opts]) => (
                  <optgroup key={provider} label={providerLabel(provider)}>
                    {opts.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          </div>
        </div>
        <div>
          <label>Difficulty</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </div>
        <div>
          <label>No. of questions</label>
          <input
            type="number"
            min={1}
            max={25}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={!canSubmit || loading}>
          {loading ? "Generating..." : "Generate quiz"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      <div className="muted" style={{ fontSize: 12 }}>
        Tip: make sure your backend is running and `NEXT_PUBLIC_API_BASE_URL` points to it (default:
        http://localhost:8000).
      </div>
    </form>
  );
}

