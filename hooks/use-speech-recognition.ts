"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal Web Speech API typings (not in TypeScript's DOM lib).
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);

/**
 * Continuous speech recognition that survives the browser's silence timeouts by
 * auto-restarting while listening. Calls `onFinal` once per finalised phrase.
 */
export function useSpeechRecognition(lang: string, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<Recognition | null>(null);
  const wantListeningRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Live speech needs Chrome or Edge. You can still type below.");
      return;
    }
    recognitionRef.current?.abort();

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (result.isFinal) {
          if (transcript) onFinalRef.current(transcript);
        } else {
          interimText += `${transcript} `;
        }
      }
      setInterim(interimText.trim());
    };

    rec.onerror = (event) => {
      if (!FATAL_ERRORS.has(event.error)) return; // no-speech / network / aborted: onend restarts
      wantListeningRef.current = false;
      setError(
        event.error === "not-allowed"
          ? "Microphone permission denied. Allow mic access, or type below."
          : `Speech recognition error: ${event.error}`,
      );
    };

    rec.onend = () => {
      if (wantListeningRef.current && recognitionRef.current === rec) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through to stopped state */
        }
      }
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = rec;
    wantListeningRef.current = true;
    setError(null);
    try {
      rec.start();
      setListening(true);
    } catch (e) {
      wantListeningRef.current = false;
      setError(`Could not start microphone: ${(e as Error).message}`);
    }
  }, [lang]);

  // Restart with the new language if it changes mid-lesson.
  useEffect(() => {
    if (wantListeningRef.current) start();
  }, [start]);

  useEffect(
    () => () => {
      wantListeningRef.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  return { listening, interim, error, start, stop };
}
