"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_PROMPTS } from "@/lib/signbridge/languages";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useWakeLock } from "@/hooks/use-wake-lock";

interface TeacherConsoleProps {
  spokenLang: string;
  /** Called with each finalised phrase (spoken, typed or preset) and the language it was in. */
  onPhrase: (text: string, lang: string) => void;
  className?: string;
  /** Extra controls rendered at the top (language pickers, room code…). */
  children?: ReactNode;
}

/** Mic capture + typed input + one-click demo prompts. */
export function TeacherConsole({ spokenLang, onPhrase, className, children }: TeacherConsoleProps) {
  const { listening, interim, error, start, stop } = useSpeechRecognition(spokenLang, (text) => onPhrase(text, spokenLang));
  const [draft, setDraft] = useState("");
  useWakeLock(listening);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onPhrase(draft, spokenLang);
    setDraft("");
  };

  return (
    <section className={cn("flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm", className)}>
      {children}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={listening ? stop : start}
          aria-pressed={listening}
          className={cn(
            "relative flex size-16 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-colors focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none",
            listening ? "bg-red-600 hover:bg-red-500" : "bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900",
          )}
        >
          {listening && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" aria-hidden />}
          {listening ? <MicOff className="size-7" /> : <Mic className="size-7" />}
          <span className="sr-only">{listening ? "Stop listening" : "Start listening"}</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{listening ? "Listening to the teacher…" : "Tap to start live translation"}</p>
          <p className="min-h-5 truncate text-sm text-muted-foreground italic">{interim || (listening ? "…" : "Or type / pick a demo sentence below")}</p>
        </div>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type what the teacher says…"
          maxLength={600}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="submit" size="lg" disabled={!draft.trim()}>
          <Send /> Sign it
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {DEMO_PROMPTS.map((p) => (
          <Button key={p.label} variant="outline" size="sm" onClick={() => onPhrase(p.text, p.lang)}>
            {p.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
