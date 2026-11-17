"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Presentation, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { card } from "./teacher-controls";

/** Start a broadcast classroom (teacher) or join one by code (learner). */
export function ClassroomLauncher() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/classroom", { method: "POST" });
      if (res.status === 503) throw new Error("Classroom mode isn't configured on the server yet.");
      if (!res.ok) throw new Error("Could not create a classroom. Check your connection and try again.");
      const { code: newCode } = (await res.json()) as { code: string };
      router.push(`/class/${newCode}/teach`);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) router.push(`/class/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={join} className={cn(card, "flex flex-col gap-3 p-5")}>
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-white">
          <Users className="size-5 text-emerald-400" /> Join as a learner
        </h2>
        <p className="text-[15px] text-white/55">Enter the code on the teacher&apos;s screen.</p>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="K7M2Q"
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Classroom code"
            className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 font-mono text-[18px] tracking-[0.3em] text-white uppercase outline-none placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-emerald-400/50"
          />
          <button
            type="submit"
            disabled={!code.trim()}
            className="h-12 rounded-2xl bg-emerald-400 px-6 text-[16px] font-semibold text-zinc-950 transition active:scale-95 disabled:opacity-40"
          >
            Join
          </button>
        </div>
      </form>
      <div className={cn(card, "flex flex-col gap-3 p-5")}>
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-white">
          <Presentation className="size-5 text-emerald-400" /> Start as the teacher
        </h2>
        <p className="text-[15px] text-white/55">Speak once. Every learner&apos;s phone signs it in their own sign language.</p>
        <button
          type="button"
          onClick={start}
          disabled={creating}
          className="h-12 rounded-2xl bg-white/10 text-[16px] font-semibold text-white transition active:scale-[0.98] hover:bg-white/15 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Start a classroom"}
        </button>
        {error && <p className="text-[13px] text-red-300">{error}</p>}
      </div>
    </div>
  );
}
