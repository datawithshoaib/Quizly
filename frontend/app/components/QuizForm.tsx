"use client";

import type { Difficulty, GenerateQuizRequest, ModelOption, QuizResponse } from "@/lib/api";
import { fetchModels, generateQuiz } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BookOpenCheck, Check, ChevronDown, CircleHelp, LoaderCircle, Sparkles, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Props = { onGenerated: (quiz: QuizResponse) => void };

function providerLabel(provider: string): string {
  return ({ openrouter: "OpenRouter", gemini: "Google Gemini", deepseek: "DeepSeek", huggingface: "Hugging Face" } as Record<string, string>)[provider] ?? provider;
}

const fieldClass = "h-12 w-full appearance-none rounded-xl border border-input bg-white px-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

export function QuizForm({ onGenerated }: Props) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [numQuestions, setNumQuestions] = useState(5);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelId, setModelId] = useState("");
  const [modelsLoading, setModelsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchModels()
      .then((options) => {
        if (cancelled) return;
        setModels(options);
        setModelId((current) => options.some((option) => option.id === current) ? current : options[0]?.id ?? "");
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => { if (!cancelled) setModelsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const modelsByProvider = useMemo(() => {
    const groups: Record<string, ModelOption[]> = {};
    for (const model of models) (groups[model.provider] ??= []).push(model);
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [models]);

  const canSubmit = topic.trim().length >= 2 && numQuestions >= 1 && numQuestions <= 25 && modelId.length > 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const body: GenerateQuizRequest = { topic: topic.trim(), difficulty, num_questions: numQuestions, model_id: modelId };
      onGenerated(await generateQuiz(body));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl items-stretch gap-5 lg:grid-cols-[1fr_0.92fr] lg:gap-7">
      <section className="relative isolate flex min-h-[570px] flex-col overflow-hidden rounded-[2rem] bg-[#111b3f] px-7 py-8 text-white shadow-[0_28px_90px_-42px_rgba(15,23,42,0.7)] sm:px-10 sm:py-10 lg:min-h-[650px] lg:px-12 lg:py-12">
        <div className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 -z-10 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]" /> Your learning studio</div>
        <h1 className="mt-8 max-w-xl text-[2.65rem] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">A little practice goes <span className="font-serif font-normal italic text-emerald-300">a long way.</span></h1>
        <p className="mt-5 max-w-md text-base leading-7 text-blue-100/75">Turn a topic you care about into a focused quiz. Learn at your pace, get helpful explanations, and build confidence as you go.</p>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-xs font-medium text-blue-50"><BookOpenCheck size={14} className="text-emerald-300" /> Personal practice</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-xs font-medium text-blue-50"><Sparkles size={14} className="text-amber-300" /> Instant feedback</span>
        </div>

        <div className="relative mt-auto pt-10 sm:pt-14">
          <div className="absolute -right-2 top-7 hidden h-24 w-24 rounded-full border border-white/10 sm:block" />
          <div className="absolute -right-7 top-3 hidden h-36 w-36 rounded-full border border-white/[0.07] sm:block" />
          <div className="relative max-w-md rounded-2xl border border-white/15 bg-white/[0.09] p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-sm sm:p-6">
            <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.17em] text-blue-200/80">A peek inside</span><span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">01 / 05</span></div>
            <p className="mt-4 text-sm font-medium leading-6 text-white sm:text-base">Which part of a plant cell captures light energy?</p>
            <div className="mt-4 grid gap-2">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-300/35 bg-emerald-300/10 px-3 py-2.5"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-300 text-[11px] font-bold text-[#111b3f]">A</span><span className="text-xs font-medium text-emerald-50">Chloroplast</span><Check size={14} className="ml-auto text-emerald-300" /></div>
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-[11px] font-semibold text-blue-100">B</span><span className="text-xs text-blue-100/75">Mitochondrion</span></div>
            </div>
            <div className="mt-5 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/5 rounded-full bg-emerald-300" /></div><span className="text-[10px] text-blue-200/70">Made for your pace</span></div>
          </div>
        </div>
      </section>

      <Card className="self-center overflow-hidden rounded-[2rem] border-white/80 shadow-[0_24px_80px_-38px_rgba(15,23,42,0.3)]">
        <div className="px-6 pb-2 pt-7 sm:px-8 sm:pt-9">
          <Badge className="mb-4 gap-1.5 border-blue-100 bg-blue-50 text-blue-700"><WandSparkles size={13} /> Build a practice set</Badge>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.75rem]">What are we learning today?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Choose a topic and shape your session.</p>
        </div>
        <CardContent className="px-6 pb-7 pt-5 sm:px-8 sm:pb-9">
          <form onSubmit={onSubmit} className="grid gap-5">
            <div className="grid gap-2">
              <label htmlFor="topic" className="text-sm font-medium text-slate-700">Your topic</label>
              <input id="topic" className={fieldClass} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Photosynthesis, React hooks…" maxLength={200} />
              <span className="text-xs text-slate-400">A subject, a skill, or something you're curious about.</span>
            </div>

            <div className="grid gap-2">
              <label htmlFor="model" className="text-sm font-medium text-slate-700">Choose your AI model</label>
              <div className="relative">
                <select id="model" className={fieldClass} value={modelId} onChange={(event) => setModelId(event.target.value)} disabled={modelsLoading || models.length === 0}>
                  {modelsLoading ? <option value="">Loading models…</option> : models.length === 0 ? <option value="">No models available</option> : modelsByProvider.map(([provider, options]) => <optgroup key={provider} label={providerLabel(provider)}>{options.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}</optgroup>)}
                </select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label htmlFor="difficulty" className="text-sm font-medium text-slate-700">Difficulty</label>
                <div className="relative"><select id="difficulty" className={fieldClass} value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} /></div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="question-count" className="text-sm font-medium text-slate-700">Length</label>
                <div className="relative"><select id="question-count" className={fieldClass} value={numQuestions} onChange={(event) => setNumQuestions(Number(event.target.value))}>{[5, 10, 15, 20, 25].map((count) => <option key={count} value={count}>{count} questions</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} /></div>
              </div>
            </div>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</div>}
            <Button type="submit" size="lg" disabled={!canSubmit || loading} className="mt-1 w-full rounded-xl">
              {loading ? <><LoaderCircle size={17} className="animate-spin" /> Creating your quiz…</> : <>Create my quiz <ArrowRight size={17} /></>}
            </Button>
            <p className="flex items-center justify-center gap-2 text-xs text-slate-400"><CircleHelp size={14} /> Around a minute to complete</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
