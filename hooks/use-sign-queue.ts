"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { fetchGloss } from "@/lib/signbridge/gloss-client";
import type { SignLanguageCode, Utterance } from "@/lib/signbridge/types";

const MAX_HISTORY = 50;

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Ordered, non-blocking translation + playback queue.
 * Translations run in parallel as the teacher speaks; playback stays in spoken order
 * (a slow translation holds its place instead of being overtaken).
 */
export function useSignQueue() {
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const seenIds = useRef(new Set<string>());

  const patch = useCallback((id: string, update: Partial<Utterance>) => {
    setUtterances((list) => list.map((u) => (u.id === id ? { ...u, ...update } : u)));
  }, []);

  /** Queue `text` for translation. Pass a stable `id` (e.g. a Convex doc id) to make it idempotent. */
  const enqueue = useCallback(
    (text: string, sourceLang: string, signLanguage: SignLanguageCode, id: string = newId()) => {
      const trimmed = text.trim();
      if (!trimmed || seenIds.current.has(id)) return;
      seenIds.current.add(id);
      setUtterances((list) =>
        [...list, { id, text: trimmed, sourceLang, signLanguage, status: "translating" as const }].slice(-MAX_HISTORY),
      );
      void fetchGloss(trimmed, sourceLang, signLanguage).then((result) => patch(id, { result, status: "ready" }));
    },
    [patch],
  );

  /** Re-queue an already translated utterance for another playback. */
  const replay = useCallback((id: string) => {
    setUtterances((list) => {
      const source = list.find((u) => u.id === id);
      if (!source?.result) return list;
      return [...list, { ...source, id: newId(), status: "ready" as const }].slice(-MAX_HISTORY);
    });
  }, []);

  /** Drop the backlog and jump to the newest sentence so the learner catches up with the teacher. */
  const skipToLive = useCallback(() => {
    setUtterances((list) => {
      const pending = list.filter((u) => u.status === "ready" || u.status === "playing");
      const keep = pending.at(-1)?.id;
      return list.map((u) => ((u.status === "ready" || u.status === "playing") && u.id !== keep ? { ...u, status: "done" as const } : u));
    });
  }, []);

  const markPlaying = useCallback((id: string) => patch(id, { status: "playing" }), [patch]);
  const markDone = useCallback((id: string) => patch(id, { status: "done" }), [patch]);
  const clear = useCallback(() => {
    seenIds.current.clear();
    setUtterances([]);
  }, []);

  // Head of the queue = oldest unfinished utterance. If it is still translating, playback waits for it.
  const current = useMemo(() => {
    const head = utterances.find((u) => u.status !== "done");
    return head && head.status !== "translating" ? head : null;
  }, [utterances]);

  const backlog = useMemo(() => utterances.filter((u) => u.status === "ready" || u.status === "translating").length, [utterances]);

  return { utterances, current, backlog, enqueue, replay, skipToLive, markPlaying, markDone, clear };
}
