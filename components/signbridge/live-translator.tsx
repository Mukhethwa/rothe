"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useSignQueue } from "@/hooks/use-sign-queue";
import { useTeacherMic } from "@/hooks/use-teacher-mic";
import type { SignLanguageCode, Utterance } from "@/lib/signbridge/types";
import { LearnerScreen } from "./learner-screen";
import { DemoChips, LanguageBar, MicButton, SpokenCard, TypeBar } from "./teacher-controls";
import { TranscriptList } from "./transcript-list";

export function lastFinishedOf(utterances: Utterance[]): Utterance | null {
  for (let i = utterances.length - 1; i >= 0; i--) {
    if (utterances[i].status === "done" && utterances[i].result) return utterances[i];
  }
  return null;
}

const noopSubscribe = () => () => {};

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Single-device mode: the phone listens and signs on the same screen. Always a phone-width column. */
export function LiveTranslator() {
  const [spokenLang, setSpokenLang] = useState("en-ZA");
  const [signLanguage, setSignLanguage] = useState<SignLanguageCode>("SASL");
  // Client clock only: a prerendered page must not bake in the build server's time of day.
  const hello = useSyncExternalStore(noopSubscribe, greeting, () => "Welcome");
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
  return (
    <div className="flex flex-col gap-3">
      <div className="pt-1">
        <p className="text-[13px] text-white/45">{hello}</p>
        <h1 className="text-[24px] leading-tight font-semibold tracking-tight text-white">What&apos;s the lesson today?</h1>
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
      <SpokenCard live={mic.interim} last={lastText} langTag={spokenLang} />
      <DemoChips onPick={onPhrase} />
      <TypeBar onSubmit={(text) => onPhrase(text, spokenLang)} />
      <TranscriptList utterances={utterances} onReplay={queue.replay} onClear={queue.clear} />

      {/* Thumb-reach mic, pinned just above the tab bar */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 bg-gradient-to-t from-[#0a0b0d] via-[#0a0b0d]/95 to-transparent px-4 pt-6 pb-3">
        <MicButton mic={mic} />
      </div>
    </div>
  );
}
