"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Presentation, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { convexEnabled } from "@/app/convex-client-provider";

/** Start a broadcast classroom (teacher) or join one by code (learner). */
export function ClassroomLauncher() {
  if (!convexEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Classroom broadcast needs Convex: run <code className="rounded bg-muted px-1">npx convex dev</code> to set{" "}
        <code className="rounded bg-muted px-1">NEXT_PUBLIC_CONVEX_URL</code>. Single-device mode above works without it.
      </p>
    );
  }
  return <Launcher />;
}

function Launcher() {
  const router = useRouter();
  const createClassroom = useMutation(api.classrooms.create);
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setCreating(true);
    setError(null);
    try {
      const newCode = await createClassroom({ title: "Lesson" });
      router.push(`/class/${newCode}/teach`);
    } catch {
      setError("Could not create a classroom. Check your connection and try again.");
      setCreating(false);
    }
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) router.push(`/class/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-xl border p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Presentation className="size-4" /> I&apos;m the teacher
        </h3>
        <p className="text-sm text-muted-foreground">Speak once. Every learner&apos;s device signs it in their own sign language.</p>
        <Button onClick={start} disabled={creating} size="lg" className="mt-auto">
          {creating ? "Creating…" : "Start a classroom"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <form onSubmit={join} className="flex flex-col gap-2 rounded-xl border p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Users className="size-4" /> I&apos;m a learner
        </h3>
        <p className="text-sm text-muted-foreground">Enter the code on the teacher&apos;s screen.</p>
        <div className="mt-auto flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. K7M2Q"
            maxLength={8}
            autoCapitalize="characters"
            className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-sm uppercase tracking-widest outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="submit" size="lg" variant="outline" disabled={!code.trim()}>
            Join
          </Button>
        </div>
      </form>
    </div>
  );
}
