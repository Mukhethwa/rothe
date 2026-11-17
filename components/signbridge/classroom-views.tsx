"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { convexEnabled } from "@/app/convex-client-provider";
import { useSignQueue } from "@/hooks/use-sign-queue";
import { useWakeLock } from "@/hooks/use-wake-lock";
import type { SignLanguageCode } from "@/lib/signbridge/types";
import { LearnerScreen } from "./learner-screen";
import { lastFinishedOf, statusOf } from "./live-translator";
import { StatusPill } from "./site-header";
import { TeacherConsole } from "./teacher-console";
import { LanguageBar } from "./teacher-controls";

type CodeParams = Promise<{ code: string }>;

const noopSubscribe = () => () => {};

function ConvexRequired() {
  return (
    <div className="mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
      Classroom mode needs a Convex deployment (<code>NEXT_PUBLIC_CONVEX_URL</code>).{" "}
      <Link href="/" className="underline">
        Use single-device mode
      </Link>
      .
    </div>
  );
}

function RoomNotFound({ code }: { code: string }) {
  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="font-semibold">No classroom with code {code}.</p>
      <Link href="/" className="text-sm underline">
        Back home
      </Link>
    </div>
  );
}

export function TeachView({ params }: { params: CodeParams }) {
  const { code } = use(params);
  return convexEnabled ? <TeachRoom code={decodeURIComponent(code).toUpperCase()} /> : <ConvexRequired />;
}

function TeachRoom({ code }: { code: string }) {
  const room = useQuery(api.classrooms.getByCode, { code });
  const phrases = useQuery(api.classrooms.recentPhrases, { code });
  const say = useMutation(api.classrooms.say);
  const [sendError, setSendError] = useState<string | null>(null);
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const joinUrl = `${origin}/class/${code}`;

  const onPhrase = useCallback(
    (text: string, lang: string) => {
      setSendError(null);
      say({ code, text, lang }).catch(() => setSendError("Could not send. Check the connection."));
    },
    [code, say],
  );

  if (room === undefined) return <p className="p-8 text-center text-sm text-muted-foreground">Loading classroom…</p>;
  if (room === null) return <RoomNotFound code={code} />;

  return (
    <div className="flex flex-col gap-3 pt-1">
      <section className="rounded-[28px] border border-white/[0.08] bg-[radial-gradient(120%_80%_at_50%_0%,#24303a_0%,#14181d_60%)] p-6 text-center">
        <p className="text-[12px] font-semibold tracking-[0.12em] text-white/50 uppercase">Learners join with code</p>
        <p className="mt-1 font-mono text-5xl font-bold tracking-[0.3em] text-emerald-300">{room.code}</p>
        <p className="mt-2 text-[13px] break-all text-white/50">{joinUrl}</p>
      </section>
      <div className="flex flex-col gap-3">
        <TeacherConsole onPhrase={onPhrase} lastSaid={phrases?.at(-1)?.text ?? null} />
        {sendError && <p className="rounded-2xl bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">{sendError}</p>}
      </div>
    </div>
  );
}

export function LearnView({ params }: { params: CodeParams }) {
  const { code } = use(params);
  return convexEnabled ? <LearnRoom code={decodeURIComponent(code).toUpperCase()} /> : <ConvexRequired />;
}

function LearnRoom({ code }: { code: string }) {
  const room = useQuery(api.classrooms.getByCode, { code });
  const phrases = useQuery(api.classrooms.recentPhrases, { code });
  const [signLanguage, setSignLanguage] = useState<SignLanguageCode>("SASL");
  const queue = useSignQueue();
  const { enqueue } = queue;
  const handledIds = useRef<Set<string> | null>(null);
  const signLanguageRef = useRef(signLanguage);
  useEffect(() => {
    signLanguageRef.current = signLanguage;
  }, [signLanguage]);
  useWakeLock(true);

  // Sign only what is said after joining; earlier phrases are history, not a backlog.
  useEffect(() => {
    if (!phrases) return;
    if (handledIds.current === null) {
      handledIds.current = new Set(phrases.map((p) => p._id));
      return;
    }
    for (const p of phrases) {
      if (handledIds.current.has(p._id)) continue;
      handledIds.current.add(p._id);
      enqueue(p.text, p.lang, signLanguageRef.current, p._id);
    }
  }, [phrases, enqueue]);

  const lastFinished = useMemo(() => lastFinishedOf(queue.utterances), [queue.utterances]);

  if (room === undefined) return <p className="p-8 text-center text-sm text-muted-foreground">Joining classroom…</p>;
  if (room === null) return <RoomNotFound code={code} />;

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-white/50">
          Class <span className="font-mono font-semibold text-white">{room.code}</span> · live
        </p>
        <StatusPill status={statusOf(false, queue.utterances, !!queue.current)} />
      </div>
      <LanguageBar signLanguage={signLanguage} onSignLanguageChange={setSignLanguage} />
      <LearnerScreen
        signLanguage={queue.current?.signLanguage ?? signLanguage}
        current={queue.current}
        lastFinished={lastFinished}
        backlog={queue.backlog}
        markPlaying={queue.markPlaying}
        markDone={queue.markDone}
        replay={queue.replay}
        skipToLive={queue.skipToLive}
      />
    </div>
  );
}
