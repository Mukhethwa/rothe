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
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
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

/** Where the recogniser has got to; shown in the UI so a silent mic is obvious. */
export type SpeechPhase = "idle" | "starting" | "mic-open" | "hearing-sound" | "hearing-speech";

const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);
const MAX_TRANSIENT_ERRORS = 3;
const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone blocked. Click the padlock in the address bar, allow Microphone, and reload. (In-app/embedded browsers block it: use Chrome or Edge.)",
  "service-not-allowed": "This browser's speech service is unavailable. Use Chrome or Edge, or type below.",
  "audio-capture": "No microphone found. Plug one in, or type below.",
  "language-not-supported": "This spoken language isn't supported by the browser's speech engine. Pick another, or type below.",
  network: "Speech service unreachable (needs internet; Chrome/Edge only). Type below instead.",
};

/**
 * Continuous speech recognition that survives the browser's silence timeouts by
 * auto-restarting while listening. Calls `onFinal` once per finalised phrase.
 */
export function useSpeechRecognition(lang: string, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SpeechPhase>("idle");
  /** Consecutive recogniser sessions that ended with no speech detected. */
  const [silentRounds, setSilentRounds] = useState(0);

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
    setPhase("idle");
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
    let consecutiveErrors = 0;

    rec.onaudiostart = () => setPhase("mic-open");
    rec.onsoundstart = () => setPhase("hearing-sound");
    rec.onspeechstart = () => setPhase("hearing-speech");

    rec.onresult = (event) => {
      consecutiveErrors = 0;
      setSilentRounds(0);
      setPhase("hearing-speech");
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
      if (event.error === "aborted") return;
      if (event.error === "no-speech") {
        // Keep listening, but count it so the UI can say the mic is hearing nothing.
        setSilentRounds((n) => n + 1);
        return;
      }
      consecutiveErrors += 1;
      if (!FATAL_ERRORS.has(event.error) && consecutiveErrors < MAX_TRANSIENT_ERRORS) return;
      wantListeningRef.current = false;
      setError(ERROR_MESSAGES[event.error] ?? `Speech recognition stopped (${event.error}). Type below instead.`);
    };

    rec.onend = () => {
      if (wantListeningRef.current && recognitionRef.current === rec) {
        try {
          rec.start();
          setPhase("starting");
          return;
        } catch {
          /* fall through to stopped state */
        }
      }
      setListening(false);
      setInterim("");
      setPhase("idle");
    };

    recognitionRef.current = rec;
    wantListeningRef.current = true;
    setError(null);
    setSilentRounds(0);
    try {
      rec.start();
      setListening(true);
      setPhase("starting");
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

  return { listening, interim, error, phase, silentRounds, start, stop };
}
