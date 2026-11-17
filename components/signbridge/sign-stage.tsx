"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { spellable } from "@/lib/signbridge/handshapes";
import { mediaUrl, type LanguagePack } from "@/lib/signbridge/sign-library";
import type { GlossToken, Utterance } from "@/lib/signbridge/types";
import { HandAvatar } from "./hand-avatar";

type Step =
  | { type: "clip"; tokenIndex: number; gloss: string; src: string }
  | { type: "letter"; tokenIndex: number; gloss: string; letterIndex: number; letter: string }
  | { type: "gap"; tokenIndex: number; gloss: string };

const LETTER_MS = 360;
const GAP_MS = 260;
const CLIP_MAX_MS = 5_000;
const END_PAUSE_MS = 500;
const BASE_CLIP_RATE = 1.25;

/** Recorded clip when one exists; otherwise fingerspell the word on the hand avatar. */
function buildSteps(tokens: GlossToken[], pack: LanguagePack): Step[] {
  return tokens.flatMap<Step>((token, tokenIndex) => {
    const clip = pack.signs[token.gloss];
    if (clip) return [{ type: "clip", tokenIndex, gloss: token.gloss, src: mediaUrl(clip) }];
    const letters: Step[] = spellable(token.gloss).map((letter, letterIndex) => ({
      type: "letter",
      tokenIndex,
      gloss: token.gloss,
      letterIndex,
      letter,
    }));
    return letters.length > 0 ? [...letters, { type: "gap", tokenIndex, gloss: token.gloss }] : [];
  });
}

interface SignStageProps {
  utterance: Utterance | null;
  pack: LanguagePack;
  speed: number;
  onActiveToken: (index: number | null) => void;
  onStart: (id: string) => void;
  onDone: (id: string) => void;
}

/** Plays one utterance's sign sequence; key it by utterance id so each sentence starts fresh. */
export function SignStage({ utterance, pack, speed, onActiveToken, onStart, onDone }: SignStageProps) {
  const result = utterance?.result;
  const steps = useMemo(() => (result ? buildSteps(result.tokens, pack) : []), [result, pack]);
  const [stepIndex, setStepIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const step = steps[stepIndex];
  const id = utterance?.id;

  useEffect(() => {
    if (id) onStart(id);
  }, [id, onStart]);

  const activeTokenIndex = step ? step.tokenIndex : null;
  useEffect(() => {
    onActiveToken(activeTokenIndex);
  }, [activeTokenIndex, onActiveToken]);

  // Advance timed steps; clips advance on `ended` (with a safety timeout for broken media).
  const stepType = step?.type;
  useEffect(() => {
    if (!id) return;
    if (!stepType) {
      const t = setTimeout(() => onDone(id), END_PAUSE_MS);
      return () => clearTimeout(t);
    }
    const ms = stepType === "clip" ? CLIP_MAX_MS : stepType === "letter" ? LETTER_MS : GAP_MS;
    const t = setTimeout(() => setStepIndex((i) => i + 1), ms / speed);
    return () => clearTimeout(t);
  }, [id, stepIndex, stepType, speed, onDone]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = BASE_CLIP_RATE * speed;
  }, [stepIndex, speed]);

  const letter = step?.type === "letter" ? step.letter : null;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4" aria-live="polite">
      {step?.type === "clip" ? (
        <video
          key={`${stepIndex}-${step.src}`}
          ref={videoRef}
          src={step.src}
          autoPlay
          muted
          playsInline
          onEnded={() => setStepIndex((i) => i + 1)}
          onError={() => setStepIndex((i) => i + 1)}
          className="h-full max-h-full w-full object-contain"
        />
      ) : (
        <>
          <HandAvatar letter={letter} className="h-56 w-auto drop-shadow-[0_10px_30px_rgba(251,191,36,0.15)] sm:h-72" />
          <SpelledWord step={step} idle={!utterance} />
        </>
      )}
    </div>
  );
}

function SpelledWord({ step, idle }: { step: Step | undefined; idle: boolean }) {
  if (idle) return <p className="text-sm text-white/50">Waiting for the teacher to speak…</p>;
  if (!step || step.type === "clip") return <p className="h-9" />;
  const letters = spellable(step.gloss);
  const active = step.type === "letter" ? step.letterIndex : -1;
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="font-mono text-2xl font-bold tracking-[0.25em] sm:text-3xl">
        {letters.map((ch, i) => (
          <span key={i} className={cn("transition-colors", i === active ? "text-amber-300" : i < active || active === -1 ? "text-white" : "text-white/30")}>
            {ch}
          </span>
        ))}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-white/40">fingerspelling · prototype avatar</p>
    </div>
  );
}

export function HandsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={cn(className)} aria-hidden>
      <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  );
}
