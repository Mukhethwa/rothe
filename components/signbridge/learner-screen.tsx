"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FastForward, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadManifest, packFor, type LanguagePack, type SignManifest } from "@/lib/signbridge/sign-library";
import type { SignLanguageCode, Utterance } from "@/lib/signbridge/types";
import { SignStage } from "./sign-stage";
import { card } from "./teacher-controls";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

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

/** The Deaf learner's view: signing stage plus the sign-grammar sequence with the live sign highlighted. */
export function LearnerScreen({ signLanguage, current, lastFinished, backlog, markPlaying, markDone, replay, skipToLive, className }: LearnerScreenProps) {
  const [manifest, setManifest] = useState<SignManifest>({});
  const [speedIndex, setSpeedIndex] = useState(1);
  const [activeToken, setActiveToken] = useState<number | null>(null);
  const speed = SPEEDS[speedIndex];

  useEffect(() => {
    void loadManifest().then(setManifest);
  }, []);

  const pack: LanguagePack = useMemo(() => packFor(manifest, signLanguage), [manifest, signLanguage]);
  const shown = current ?? lastFinished;
  const result = shown?.result;
  const onActiveToken = useCallback((i: number | null) => setActiveToken(i), []);
  const offline = result?.source === "offline";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Signing stage */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(120%_80%_at_50%_0%,#24303a_0%,#14181d_55%,#0d1013_100%)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
        <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2">
          <span className="rounded-full bg-black/40 px-3 py-1.5 text-[12px] font-semibold text-white/90 backdrop-blur-md">
            {signLanguage}
            <span className={cn("ml-1.5 font-medium", offline ? "text-amber-300" : "text-emerald-300")}>
              · {result ? (offline ? "Offline" : "AI grammar") : "Ready"}
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            {backlog > 1 && (
              <button
                type="button"
                onClick={skipToLive}
                className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-200 backdrop-blur-md"
                title="Skip the backlog and jump to what the teacher is saying now"
              >
                <FastForward className="size-3.5" /> Live · {backlog}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)}
              className="rounded-full bg-black/40 px-3 py-1.5 text-[12px] font-semibold text-white/90 tabular-nums backdrop-blur-md"
              aria-label={`Signing speed ${speed}x, tap to change`}
            >
              {speed}× Speed
            </button>
          </div>
        </div>

        <div className="relative flex min-h-[330px] items-center justify-center pt-10 sm:min-h-[400px]">
          <SignStage
            key={current?.id ?? "idle"}
            utterance={current}
            pack={pack}
            speed={speed}
            onActiveToken={onActiveToken}
            onStart={markPlaying}
            onDone={markDone}
          />
          {!current && lastFinished?.result && (
            <button
              type="button"
              onClick={() => replay(lastFinished.id)}
              className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md"
              aria-label="Replay last sentence"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
        </div>

        {result && (
          <div className="mx-3 mb-3 rounded-2xl bg-black/35 px-4 py-2.5 text-center text-[13px] text-white/80 backdrop-blur-md">
            Facial cue: <span className="text-white">{/^(none|neutral)\b/i.test(result.nonManual.trim()) ? "Neutral face" : result.nonManual}</span>
          </div>
        )}
      </section>

      {result?.fallbackReason && (
        <p role="status" className="rounded-2xl bg-amber-400/10 px-4 py-2.5 text-[13px] text-amber-200">
          {result.fallbackReason === "not_configured"
            ? "AI translation is off on the server. Showing basic offline gloss."
            : "AI translation unreachable. Showing basic offline gloss until it's back."}
        </p>
      )}

      {/* Sign grammar sequence */}
      <section className={cn(card, "px-4 py-3.5")}>
        <p className="mb-2.5 text-[12px] font-semibold tracking-[0.08em] text-white/45 uppercase">Sign grammar sequence</p>
        <div className="flex min-h-9 flex-wrap gap-2" aria-label="Sign gloss">
          {result ? (
            result.tokens.map((t, i) => {
              const active = !!current && activeToken === i;
              return (
                <span
                  key={`${shown?.id}-${i}`}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[14px] font-semibold tracking-wide transition-all duration-200",
                    active
                      ? "scale-105 bg-emerald-400 text-zinc-950 shadow-[0_0_24px_rgba(52,211,153,0.65)]"
                      : "bg-white/[0.08] text-white/80",
                  )}
                >
                  {t.gloss}
                </span>
              );
            })
          ) : (
            <span className="text-[14px] text-white/35">Signs appear here in sign-language order</span>
          )}
        </div>
      </section>
    </div>
  );
}
