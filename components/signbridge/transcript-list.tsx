"use client";

import { Loader2, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signLanguageInfo } from "@/lib/signbridge/languages";
import type { Utterance } from "@/lib/signbridge/types";
import { cn } from "@/lib/utils";

export function TranscriptList({ utterances, onReplay, onClear }: { utterances: Utterance[]; onReplay: (id: string) => void; onClear: () => void }) {
  if (utterances.length === 0) return null;
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Lesson transcript</h2>
        <Button variant="ghost" size="xs" onClick={onClear}>
          <Trash2 /> Clear
        </Button>
      </div>
      <ol className="flex max-h-72 flex-col-reverse gap-2 overflow-y-auto">
        {utterances.map((u) => (
          <li key={u.id} className={cn("rounded-lg border px-3 py-2 text-sm", u.status === "playing" && "border-amber-400 bg-amber-50 dark:bg-amber-400/10")}>
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0">{u.text}</p>
              <div className="flex shrink-0 items-center gap-1">
                <span className="rounded bg-muted px-1 font-mono text-[10px] font-semibold" title={signLanguageInfo(u.signLanguage).name}>
                  {u.signLanguage}
                </span>
                {u.status === "translating" ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Translating" />
                ) : (
                  <Button variant="ghost" size="icon-xs" onClick={() => onReplay(u.id)} aria-label="Replay signs" disabled={!u.result}>
                    <Play />
                  </Button>
                )}
              </div>
            </div>
            {u.result && <p className="mt-1 font-mono text-xs text-muted-foreground">{u.result.tokens.map((t) => t.gloss).join(" ")}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
