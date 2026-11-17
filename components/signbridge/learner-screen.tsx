"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FastForward, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signLanguageInfo } from "@/lib/signbridge/languages";
import { loadManifest, packFor, type LanguagePack, type SignManifest } from "@/lib/signbridge/sign-library";
import type { SentenceType, SignLanguageCode, Utterance } from "@/lib/signbridge/types";
import { SignStage } from "./sign-stage";

const SENTENCE_LABEL: Record<SentenceType, string> = {
  statement: "Statement",
  yes_no_question: "Yes/No question",
  wh_question: "Wh- question",
  negation: "Negation",
  command: "Instruction",
};

interface LearnerScreenProps {
  signLanguage: SignLanguageCode;
  current: Utterance | null;
  lastFinished: Utterance | null;
  backlog: number;
  markPlaying: (id: string) => void;
  markDone: (id: string) => void;
  replay: (id: string) => void;
  skipToLive: () => void;
  className?: string;
}

/** The Deaf learner's view: sign playback, gloss strip with live highlight, and grammar cues. */
export function LearnerScreen({ signLanguage, current, lastFinished, backlog, markPlaying, markDone, replay, skipToLive, className }: LearnerScreenProps) {
  const [manifest, setManifest] = useState<SignManifest>({});
  const [speed, setSpeed] = useState(1);
  const [activeToken, setActiveToken] = useState<number | null>(null);

  useEffect(() => {
    void loadManifest().then(setManifest);
  }, []);

  const pack: LanguagePack = useMemo(() => packFor(manifest, signLanguage), [manifest, signLanguage]);
  const shown = current ?? lastFinished;
  const result = shown?.result;
  const info = signLanguageInfo(signLanguage);
  const onActiveToken = useCallback((i: number | null) => setActiveToken(i), []);

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-2xl bg-zinc-950 text-white shadow-xl ring-1 ring-white/10", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="rounded bg-amber-400 px-1.5 py-0.5 font-mono text-[11px] font-bold text-zinc-950">{info.code}</span>
          <span>{info.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                result.source === "ai" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300",
              )}
              title={result.source === "ai" ? "Grammar-aware AI translation" : "Offline rule-based fallback"}
            >
              {result.source === "ai" ? "AI grammar" : "Offline"}
            </span>
          )}
          {backlog > 1 && (
            <Button size="xs" variant="secondary" onClick={skipToLive} title="Skip the backlog and jump to what the teacher is saying now">
              <FastForward /> Live ({backlog})
            </Button>
          )}
        </div>
      </header>

      {result?.fallbackReason && (
        <p role="status" className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs text-amber-200">
          {result.fallbackReason === "not_configured"
            ? "AI translation is off: ANTHROPIC_API_KEY is not set on the server. Showing basic offline gloss (no real sign grammar)."
            : "AI translation could not be reached. Showing basic offline gloss until it is back."}
        </p>
      )}

      <div className="relative min-h-[260px] flex-1 sm:min-h-[340px]">
        <SignStage
          key={current?.id ?? "idle"}
          utterance={current}
          pack={pack}
          speed={speed}
          onActiveToken={onActiveToken}
          onStart={markPlaying}
          onDone={markDone}
        />
        {result && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/80">{SENTENCE_LABEL[result.sentenceType]}</span>
            <span className="rounded-md bg-sky-500/20 px-2 py-1 text-[11px] text-sky-200">Face: {result.nonManual}</span>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-white/10 px-4 py-3">
        <div className="flex min-h-9 flex-wrap items-center gap-1.5" aria-label="Sign gloss">
          {result ? (
            result.tokens.map((t, i) => (
              <span
                key={`${shown?.id}-${i}`}
                className={cn(
                  "rounded-md px-2 py-1 font-mono text-sm font-semibold transition-colors",
                  current && activeToken === i ? "bg-amber-400 text-zinc-950" : "bg-white/10 text-white/80",
                  t.kind === "fingerspell" && "underline decoration-dotted underline-offset-4",
                )}
              >
                {t.gloss}
              </span>
            ))
          ) : (
            <span className="text-sm text-white/40">Sign grammar (gloss) appears here</span>
          )}
        </div>
        {shown && <p className="truncate text-xs text-white/50">“{shown.text}”</p>}
        <div className="flex items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 text-xs text-white/60">
            Speed
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.25}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-24 accent-amber-400"
            />
            <span className="w-8 tabular-nums">{speed}×</span>
          </label>
          {!current && lastFinished?.result && (
            <Button size="xs" variant="secondary" onClick={() => replay(lastFinished.id)}>
              <RotateCcw /> Replay
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
