"use client";

import { useCallback, useMemo, useState } from "react";
import { useSignQueue } from "@/hooks/use-sign-queue";
import type { SignLanguageCode, Utterance } from "@/lib/signbridge/types";
import { LearnerScreen } from "./learner-screen";
import { SignLanguageSelect, SpokenLanguageSelect } from "./language-select";
import { TeacherConsole } from "./teacher-console";
import { TranscriptList } from "./transcript-list";

export function lastFinishedOf(utterances: Utterance[]): Utterance | null {
  for (let i = utterances.length - 1; i >= 0; i--) {
    if (utterances[i].status === "done" && utterances[i].result) return utterances[i];
  }
  return null;
}

/** Single-device mode: one phone/tablet/laptop listens and signs on the same screen. */
export function LiveTranslator() {
  const [spokenLang, setSpokenLang] = useState("en-ZA");
  const [signLanguage, setSignLanguage] = useState<SignLanguageCode>("SASL");
  const queue = useSignQueue();
  const { enqueue, utterances } = queue;

  const onPhrase = useCallback((text: string, lang: string) => enqueue(text, lang, signLanguage), [enqueue, signLanguage]);

  // Switching sign language re-signs the latest sentence so the difference is visible immediately.
  const changeSignLanguage = (code: SignLanguageCode) => {
    setSignLanguage(code);
    const last = utterances.at(-1);
    if (last && last.signLanguage !== code) enqueue(last.text, last.sourceLang, code);
  };

  const lastFinished = useMemo(() => lastFinishedOf(utterances), [utterances]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <TeacherConsole spokenLang={spokenLang} onPhrase={onPhrase}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SpokenLanguageSelect value={spokenLang} onChange={setSpokenLang} />
            <SignLanguageSelect value={signLanguage} onChange={changeSignLanguage} />
          </div>
        </TeacherConsole>
        <TranscriptList utterances={utterances} onReplay={queue.replay} onClear={queue.clear} />
      </div>
      <LearnerScreen
        className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)]"
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
  );
}
