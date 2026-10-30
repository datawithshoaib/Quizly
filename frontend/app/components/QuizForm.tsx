"use client";

import type { AppConfig, Difficulty, GenerateQuizRequest, QuizResponse } from "@/lib/api";
import { fetchConfig, generateQuiz, setApiKey } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowRight, BookOpenCheck, Clock, KeyRound, LoaderCircle, MessageSquareText, Sparkles, TriangleAlert, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";

type Props = { onGenerated: (quiz: QuizResponse) => void };

const SUGGESTIONS = ["Photosynthesis", "React hooks", "The French Revolution", "Linear algebra", "Machine learning basics"];

const FEATURES = [
  { icon: Sparkles, title: "Tailored to you", body: "Any topic, at the difficulty you choose." },
  { icon: MessageSquareText, title: "Instant explanations", body: "Learn why an answer is right, as you go." },
  { icon: BookOpenCheck, title: "Personal study notes", body: "A focused review of what to revisit." },
];

export function QuizForm({ onGenerated }: Props) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [numQuestions, setNumQuestions] = useState(5);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [apiKey, setApiKeyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchConfig()
      .then((value) => { if (!cancelled) setConfig(value); })
      .catch(() => { /* The key field still works without provider details. */ });
    return () => { cancelled = true; };
  }, []);

  const apiKeyRequired = config !== null && !config.server_api_key_configured;
  const canSubmit = topic.trim().length >= 2 && numQuestions >= 1 && numQuestions <= 25 && (!apiKeyRequired || apiKey.trim().length > 0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    setApiKey(apiKey);
    try {
      const body: GenerateQuizRequest = { topic: topic.trim(), difficulty, num_questions: numQuestions };
      onGenerated(await generateQuiz(body));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      <section className="animate-fade-up">
        <Badge variant="soft" className="mb-5 rounded-full px-3 py-1">
          <WandSparkles /> AI-powered practice
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
          A little practice goes{" "}
          <span className="bg-gradient-to-r from-primary to-brand bg-clip-text text-transparent">a long way.</span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
          Turn any topic into a focused quiz. Learn at your own pace, get clear explanations, and build confidence as you go.
        </p>

        <ul className="mt-9 grid gap-5">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-primary shadow-sm">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Card className="animate-fade-up shadow-xl shadow-primary/5 [animation-delay:80ms]">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">What are we learning today?</CardTitle>
          <CardDescription>Choose a topic and shape your session.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="topic">Topic</Label>
              <Input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Photosynthesis, React hooks…" maxLength={200} autoFocus />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTopic(suggestion)}
                    className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Difficulty</Label>
              <ToggleGroup type="single" value={difficulty} onValueChange={(value) => value && setDifficulty(value as Difficulty)} className="w-full">
                <ToggleGroupItem value="easy">Easy</ToggleGroupItem>
                <ToggleGroupItem value="medium">Medium</ToggleGroupItem>
                <ToggleGroupItem value="hard">Hard</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="question-count">Length</Label>
              <Select value={String(numQuestions)} onValueChange={(value) => setNumQuestions(Number(value))}>
                <SelectTrigger id="question-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 25].map((count) => (
                    <SelectItem key={count} value={String(count)}>{count} questions</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="api-key" className="flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-muted-foreground" />
                {config ? `${config.provider_label} API key` : "API key"}
                {!apiKeyRequired && <span className="font-normal text-muted-foreground">(optional)</span>}
              </Label>
              <Input id="api-key" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKeyInput(event.target.value)} placeholder={apiKeyRequired ? "Paste your API key" : "Leave blank to use the default key"} />
              <p className="text-xs text-muted-foreground">Used only for your requests and never saved.</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>Couldn&apos;t create your quiz</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3">
              <Button type="submit" size="lg" disabled={!canSubmit || loading} className="w-full">
                {loading ? <><LoaderCircle className="animate-spin" /> Creating your quiz…</> : <>Create my quiz <ArrowRight /></>}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> About {Math.max(1, Math.round(numQuestions / 5))} min to complete
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
