"use client";

import { SIGN_LANGUAGES, SPOKEN_LANGUAGES } from "@/lib/signbridge/languages";
import type { SignLanguageCode } from "@/lib/signbridge/types";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function SignLanguageSelect({ value, onChange, className }: { value: SignLanguageCode; onChange: (v: SignLanguageCode) => void; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs font-medium text-muted-foreground", className)}>
      Learner signs in
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value as SignLanguageCode)}>
        {SIGN_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name} ({l.code})
          </option>
        ))}
      </select>
    </label>
  );
}

export function SpokenLanguageSelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs font-medium text-muted-foreground", className)}>
      Teacher speaks
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {SPOKEN_LANGUAGES.map((l) => (
          <option key={l.tag} value={l.tag}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
