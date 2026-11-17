"use client";

import { useMicLevel } from "./use-mic-level";
import { useSpeechRecognition } from "./use-speech-recognition";
import { useWakeLock } from "./use-wake-lock";

/** Speech recognition + mic level + screen wake lock, as one teacher-mic state. */
export function useTeacherMic(spokenLang: string, onPhrase: (text: string, lang: string) => void) {
  const speech = useSpeechRecognition(spokenLang, (text) => onPhrase(text, spokenLang));
  useWakeLock(speech.listening);
  const mic = useMicLevel(speech.listening);
  return { ...speech, mic };
}

export type TeacherMic = ReturnType<typeof useTeacherMic>;
