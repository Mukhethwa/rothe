"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { mediaUrl, type LanguagePack } from "@/lib/signbridge/sign-library";
import type { GlossToken, Utterance } from "@/lib/signbridge/types";

type Step =
  | { type: "clip"; tokenIndex: number; gloss: string; src: string }
  | { type: "card"; tokenIndex: number; gloss: string }
  | { type: "letter"; tokenIndex: number; gloss: string; letter: string; src?: string };

const CARD_MS = 950;
const LETTER_MS = 420;
const CLIP_MAX_MS = 5_000;
const END_PAUSE_MS = 350;
const BASE_CLIP_RATE = 1.25;

function buildSteps(tokens: GlossToken[], pack: LanguagePack): Step[] {
  return tokens.flatMap<Step>((token, tokenIndex) => {
    const clip = pack.signs[token.gloss];
    if (clip) return [{ type: "clip", tokenIndex, gloss: token.gloss, src: mediaUrl(clip) }];
    if (token.kind === "fingerspell") {
      return [...token.gloss.replace(/[^\p{L}\p{N}]/gu, "")].map((letter) => {
        const art = pack.alphabet[letter.toUpperCase()];
        return { type: "letter" as const, tokenIndex, gloss: token.gloss, letter, src: art ? mediaUrl(art) : undefined };
      });
    }
    return [{ type: "card", tokenIndex, gloss: token.gloss }];
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
    const ms = stepType === "clip" ? CLIP_MAX_MS : stepType === "letter" ? LETTER_MS : CARD_MS;
    const t = setTimeout(() => setStepIndex((i) => i + 1), ms / speed);
    return () => clearTimeout(t);
  }, [id, stepIndex, stepType, speed, onDone]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = BASE_CLIP_RATE * speed;
  }, [stepIndex, speed]);

  if (!utterance) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/60">
        <HandsIcon className="size-16 text-white/30" />
        <p className="max-w-xs text-sm">Waiting for the teacher to speak…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center" aria-live="polite">
      {step?.type === "clip" && (
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
      )}
      {step?.type === "card" && (
        <div key={stepIndex} className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-2 duration-200">
          <span className="text-5xl font-bold tracking-wide text-white sm:text-7xl">{step.gloss}</span>
          <span className="text-xs uppercase tracking-widest text-white/40">sign · clip not recorded yet</span>
        </div>
      )}
      {step?.type === "letter" && (
        <div key={stepIndex} className="animate-in fade-in flex flex-col items-center gap-3 duration-150">
          {step.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- local handshape art, dynamic per language
            <img src={step.src} alt={`Fingerspell ${step.letter}`} className="h-48 w-48 object-contain sm:h-64 sm:w-64" />
          ) : (
            <span className="text-8xl font-black text-amber-300 sm:text-9xl">{step.letter.toUpperCase()}</span>
          )}
          <span className="text-xs uppercase tracking-widest text-white/40">fingerspelling {step.gloss}</span>
        </div>
      )}
      {!step && <span className="text-sm text-white/40">✓</span>}
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
