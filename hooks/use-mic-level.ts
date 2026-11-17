"use client";

import { useEffect, useState } from "react";

const OPEN_TIMEOUT_MS = 4_000;
const OPEN_TIMEOUT_MESSAGE = "The selected microphone is not responding.";

export interface MicLevel {
  /** 0..1 smoothed input level. */
  level: number;
  /** Name of the input device the browser picked, e.g. "Microphone (Realtek Audio)". */
  deviceLabel: string | null;
  error: string | null;
}

/**
 * Opens the default microphone while `active` and reports its level, so the user can see
 * whether any sound reaches the browser (the speech API itself gives no level feedback).
 */
export function useMicLevel(active: boolean): MicLevel {
  const [state, setState] = useState<MicLevel>({ level: 0, deviceLabel: null, error: null });

  useEffect(() => {
    if (!active || !navigator.mediaDevices?.getUserMedia) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let frame = 0;

    (async () => {
      try {
        // A broken or virtual default device can make getUserMedia hang forever rather than fail.
        const opened = navigator.mediaDevices.getUserMedia({ audio: true });
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(OPEN_TIMEOUT_MESSAGE)), OPEN_TIMEOUT_MS),
        );
        stream = await Promise.race([opened, timeout]).catch(async (e: Error) => {
          if (e.message !== OPEN_TIMEOUT_MESSAGE) throw e;
          const inputs = (await navigator.mediaDevices.enumerateDevices())
            .filter((d) => d.kind === "audioinput" && d.label)
            .map((d) => d.label);
          throw new Error(
            `${OPEN_TIMEOUT_MESSAGE}${inputs.length ? ` Available: ${inputs.join(" | ")}.` : ""} Choose a working one via the mic icon in the address bar, then reload.`,
          );
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const label = stream.getAudioTracks()[0]?.label || "Default microphone";
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        let smoothed = 0;
        let lastPush = 0;
        const tick = (now: number) => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += v * v;
          const rms = Math.sqrt(sum / buf.length);
          smoothed = Math.max(Math.min(1, rms * 6), smoothed * 0.85);
          if (now - lastPush > 80) {
            lastPush = now;
            setState({ level: smoothed, deviceLabel: label, error: null });
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (e) {
        if (!cancelled) setState({ level: 0, deviceLabel: null, error: (e as Error).message });
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
      setState({ level: 0, deviceLabel: null, error: null });
    };
  }, [active]);

  return state;
}
