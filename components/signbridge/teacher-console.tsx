"use client";

import { useState } from "react";
import { useTeacherMic } from "@/hooks/use-teacher-mic";
import { DemoChips, LanguageBar, MicButton, SpokenCard, TypeBar } from "./teacher-controls";

/** Classroom-mode teacher controls: language, live mic, typed input and demo prompts. */
export function TeacherConsole({ onPhrase, lastSaid }: { onPhrase: (text: string, lang: string) => void; lastSaid: string | null }) {
  const [spokenLang, setSpokenLang] = useState("en-ZA");
  const mic = useTeacherMic(spokenLang, onPhrase);
  return (
    <div className="flex flex-col gap-3">
      <LanguageBar spokenLang={spokenLang} onSpokenLangChange={setSpokenLang} />
      <SpokenCard live={mic.interim} last={lastSaid} langTag={spokenLang} />
      <DemoChips onPick={onPhrase} />
      <TypeBar onSubmit={(text) => onPhrase(text, spokenLang)} />
      <MicButton mic={mic} label="Start teaching" />
    </div>
  );
}
