"use client";

import { useCallback, useMemo, useState } from "react";
import { useSignQueue } from "@/hooks/use-sign-queue";
import { useTeacherMic } from "@/hooks/use-teacher-mic";
import type { SignLanguageCode, Utterance } from "@/lib/signbridge/types";
import { LearnerScreen } from "./learner-screen";
import { StatusPill, type AppStatus } from "./site-header";
import { DemoChips, LanguageBar, MicButton, SpokenCard, TypeBar } from "./teacher-controls";
import { TranscriptList } from "./transcript-list";

export function lastFinishedOf(utterances: Utterance[]): Utterance | null {
  for (let i = utterances.length - 1; i >= 0; i--) {
    if (utterances[i].status === "done" && utterances[i].result) return utterances[i];
  }
  return null;
}

export function statusOf(listening: boolean, utterances: Utterance[], signing: boolean): AppStatus {
  if (utterances.some((u) => u.status === "translating")) return "translating";
  if (signing) return "signing";
  if (listening) return "listening";
  return "ready";
}

/**
 * Single-device mode: the phone/tablet listens and signs on the same screen.
 * Phone-first single column; two columns from `lg` (stage left, controls right).
 */
export function LiveTranslator() {
  const [spokenLang, setSpokenLang] = useState("en-ZA");
  const [signLanguage, setSignLanguage] = useState<SignLanguageCode>("SASL");
  const queue = useSignQueue();
  const { enqueue, utterances } = queue;

  const onPhrase = useCallback((text: string, lang: string) => enqueue(text, lang, signLanguage), [enqueue, signLanguage]);
  const mic = useTeacherMic(spokenLang, onPhrase);

  // Switching sign language re-signs the latest sentence so the difference is visible immediately.
  const changeSignLanguage = (code: SignLanguageCode) => {
    setSignLanguage(code);
    const last = utterances.at(-1);
    if (last && last.signLanguage !== code) enqueue(last.text, last.sourceLang, code);
  };

  const lastFinished = useMemo(() => lastFinishedOf(utterances), [utterances]);
  const lastText = (queue.current ?? utterances.at(-1))?.text ?? null;
  const status = statusOf(mic.listening, utterances, !!queue.current);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="flex flex-col gap-3 lg:sticky lg:top-6">
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-[13px] text-white/45">Live classroom</span>
          <StatusPill status={status} />
        </div>
        <LanguageBar spokenLang={spokenLang} onSpokenLangChange={setSpokenLang} signLanguage={signLanguage} onSignLanguageChange={changeSignLanguage} />
        <LearnerScreen
          signLanguage={queue.current?.signLanguage ?? signLanguage}
          current={queue.current}
          lastFinished={lastFinished}
          backlog={queue.backlog}
          markPlaying={queue.markPlaying}
          markDone={queue.markDone}
          replay={queue.replay}
          skipToLive={queue.skipToLive}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="hidden items-center justify-between lg:flex">
          <span className="text-[13px] text-white/45">Teacher</span>
          <StatusPill status={status} />
        </div>
        <SpokenCard live={mic.interim} last={lastText} langTag={spokenLang} />
        <DemoChips onPick={onPhrase} />
        <TypeBar onSubmit={(text) => onPhrase(text, spokenLang)} />
        <div className="hidden lg:block">
          <MicButton mic={mic} />
        </div>
        <TranscriptList utterances={utterances} onReplay={queue.replay} onClear={queue.clear} />
      </div>

      {/* Thumb-reach mic on phones and tablets */}
      <div className="sticky bottom-0 z-20 -mx-4 bg-gradient-to-t from-[#0a0b0d] via-[#0a0b0d]/95 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
        <MicButton mic={mic} />
      </div>
    </div>
  );
}
