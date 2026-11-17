"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Mic, Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_PROMPTS, SIGN_LANGUAGES, SPOKEN_LANGUAGES } from "@/lib/signbridge/languages";
import type { SignLanguageCode } from "@/lib/signbridge/types";
import type { SpeechPhase } from "@/hooks/use-speech-recognition";
import type { TeacherMic } from "@/hooks/use-teacher-mic";

/** Shared surface style for the phone-first cards. */
export const card = "rounded-[22px] border border-white/[0.07] bg-white/[0.04] backdrop-blur-xl";

const PHASE_LABEL: Record<SpeechPhase, string> = {
  idle: "Stopped",
  starting: "Connecting…",
  "mic-open": "Listening, waiting for sound",
  "hearing-sound": "Hearing sound…",
  "hearing-speech": "Hearing speech",
};

const SIGN_COUNTRY: Record<SignLanguageCode, string> = { SASL: "SA", NSL: "NG", KSL: "KE", ASL: "US" };

const SPOKEN_SHORT: Record<string, string> = {
  "en-ZA": "English",
  "en-NG": "English (NG)",
  "en-KE": "English (KE)",
  "en-US": "English (US)",
  "es-ES": "Español",
  "fr-FR": "Français",
  "zu-ZA": "isiZulu",
  "af-ZA": "Afrikaans",
  "sw-KE": "Kiswahili",
};

/** "English → SASL" segmented control; each half is a native select for accessibility on phones. */
export function LanguageBar({
  spokenLang,
  onSpokenLangChange,
  signLanguage,
  onSignLanguageChange,
}: {
  spokenLang?: string;
  onSpokenLangChange?: (tag: string) => void;
  signLanguage?: SignLanguageCode;
  onSignLanguageChange?: (code: SignLanguageCode) => void;
}) {
  return (
    <div className={cn(card, "flex items-center gap-1 p-1")}>
      {spokenLang !== undefined && onSpokenLangChange && (
        <label className="relative flex h-11 flex-1 items-center justify-center rounded-[16px] text-[15px] font-medium text-white/70 transition-colors hover:bg-white/5">
          <span>{SPOKEN_SHORT[spokenLang] ?? spokenLang}</span>
          <span className="sr-only">Teacher speaks</span>
          <select
            value={spokenLang}
            onChange={(e) => onSpokenLangChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Teacher speaks"
          >
            {SPOKEN_LANGUAGES.map((l) => (
              <option key={l.tag} value={l.tag}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {spokenLang !== undefined && signLanguage !== undefined && <ArrowRight className="size-4 shrink-0 text-white/40" aria-hidden />}
      {signLanguage !== undefined && onSignLanguageChange && (
        <label className="relative flex h-11 flex-1 items-center justify-center rounded-[16px] bg-emerald-400/15 text-[15px] font-semibold text-emerald-300 ring-1 ring-emerald-400/25 transition-colors hover:bg-emerald-400/20">
          <span>{signLanguage}</span>
          <span className="ml-1.5 text-[13px] font-medium text-emerald-300/60">({SIGN_COUNTRY[signLanguage]})</span>
          <select
            value={signLanguage}
            onChange={(e) => onSignLanguageChange(e.target.value as SignLanguageCode)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Learner signs in"
          >
            {SIGN_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

/** What the teacher is saying (live) or last said. */
export function SpokenCard({ live, last, langTag }: { live: string; last: string | null; langTag: string }) {
  const lang = SPOKEN_SHORT[langTag] ?? langTag;
  return (
    <section className={cn(card, "px-5 py-4")} aria-live="polite">
      <p className="text-[13px] font-medium text-white/45">Teacher said ({lang})</p>
      <p className={cn("mt-1 text-[19px] leading-snug font-semibold text-white", !live && !last && "text-white/30")}>
        {live ? <span className="text-white/70 italic">{live}…</span> : last ? `“${last}”` : "Tap the mic and start teaching."}
      </p>
    </section>
  );
}

export function DemoChips({ onPick }: { onPick: (text: string, lang: string) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {DEMO_PROMPTS.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onPick(p.text, p.lang)}
          className="h-11 shrink-0 rounded-full border border-white/[0.08] bg-white/[0.06] px-5 text-[15px] font-medium text-white/85 transition active:scale-95 hover:bg-white/10"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function TypeBar({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSubmit(draft);
    setDraft("");
  };
  return (
    <form onSubmit={submit} className={cn(card, "flex items-center gap-2 rounded-full p-1.5 pl-5")}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Or type a teacher sentence…"
        maxLength={600}
        enterKeyHint="send"
        className="h-10 min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/35"
        aria-label="Type what the teacher says"
      />
      <button
        type="submit"
        disabled={!draft.trim()}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition disabled:opacity-30 enabled:hover:bg-white/20"
        aria-label="Sign it"
      >
        <Send className="size-4" />
      </button>
    </form>
  );
}

/** Big thumb-reach mic button with live level, device and troubleshooting hints. */
export function MicButton({ mic, label = "Start Live Classroom Mic" }: { mic: TeacherMic; label?: string }) {
  const { listening, phase, silentRounds, error, start, stop } = mic;
  const level = mic.mic.level;
  const sound = level > 0.08;

  return (
    <div className="space-y-2">
      {(listening || error) && (
        <div className={cn(card, "space-y-1.5 px-4 py-3 text-[13px]")}>
          {listening && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-white/50">Mic</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" role="meter" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={1} aria-valuenow={level}>
                  <div className={cn("h-full rounded-full transition-[width] duration-75", sound ? "bg-emerald-400" : "bg-white/30")} style={{ width: `${Math.round(level * 100)}%` }} />
                </div>
                <span className={cn("shrink-0", phase === "hearing-speech" ? "text-emerald-300" : "text-white/50")}>{PHASE_LABEL[phase]}</span>
              </div>
              <p className="truncate text-white/40">{mic.mic.deviceLabel ? mic.mic.deviceLabel : mic.mic.error ? "Microphone problem" : "Opening microphone…"}</p>
              {mic.mic.error && <p className="text-red-300">{mic.mic.error}</p>}
              {silentRounds >= 1 && phase !== "hearing-speech" && (
                <p className="text-amber-300">
                  {sound
                    ? "Sound is arriving but no speech is recognised. Speak closer or louder."
                    : "No sound from this mic. Tap the mic icon in the address bar and choose another microphone, then reload."}
                </p>
              )}
            </>
          )}
          {error && <p className="text-red-300">{error}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-pressed={listening}
        className={cn(
          "relative flex h-16 w-full items-center justify-center gap-3 overflow-hidden rounded-[22px] text-[17px] font-semibold transition active:scale-[0.98]",
          listening
            ? "bg-red-500 text-white shadow-[0_10px_40px_-10px_rgba(239,68,68,0.7)]"
            : "bg-emerald-400 text-zinc-950 shadow-[0_10px_40px_-10px_rgba(52,211,153,0.7)]",
        )}
      >
        {listening && (
          <span
            className="absolute inset-y-0 left-0 bg-white/15 transition-[width] duration-75"
            style={{ width: `${Math.round(level * 100)}%` }}
            aria-hidden
          />
        )}
        <span className="relative">{listening ? "Stop listening" : label}</span>
        {listening ? <Square className="relative size-5 fill-current" /> : <Mic className="relative size-5" />}
      </button>
    </div>
  );
}
