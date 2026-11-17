"use client";

import { Loader2, Play } from "lucide-react";
import type { Utterance } from "@/lib/signbridge/types";
import { cn } from "@/lib/utils";
import { card } from "./teacher-controls";

export function TranscriptList({ utterances, onReplay, onClear }: { utterances: Utterance[]; onReplay: (id: string) => void; onClear: () => void }) {
  if (utterances.length === 0) return null;
  return (
    <section className={cn(card, "px-4 py-3.5")}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[12px] font-semibold tracking-[0.08em] text-white/45 uppercase">Lesson transcript</h2>
        <button type="button" onClick={onClear} className="text-[13px] font-medium text-emerald-300">
          Clear
        </button>
      </div>
      <ol className="flex max-h-72 flex-col-reverse divide-y divide-y-reverse divide-white/[0.06] overflow-y-auto">
        {utterances.map((u) => (
          <li key={u.id} className={cn("flex items-start gap-3 py-2.5", u.status === "playing" && "text-emerald-200")}>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-snug text-white/90">{u.text}</p>
              {u.result && <p className="mt-0.5 text-[12px] font-medium tracking-wide text-white/40">{u.result.tokens.map((t) => t.gloss).join(" · ")}</p>}
            </div>
            <span className="mt-0.5 rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-white/60">{u.signLanguage}</span>
            {u.status === "translating" ? (
              <Loader2 className="mt-0.5 size-5 animate-spin text-white/40" aria-label="Translating" />
            ) : (
              <button
                type="button"
                onClick={() => onReplay(u.id)}
                disabled={!u.result}
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/80 disabled:opacity-30"
                aria-label="Replay signs"
              >
                <Play className="size-3.5 fill-current" />
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
