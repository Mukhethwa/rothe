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
import { SignLanguageSelect, SpokenLanguageSelect } from "./language-select";
import { lastFinishedOf } from "./live-translator";
import { TeacherConsole } from "./teacher-console";

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
  const [spokenLang, setSpokenLang] = useState("en-ZA");
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <TeacherConsole spokenLang={spokenLang} onPhrase={onPhrase}>
        <SpokenLanguageSelect value={spokenLang} onChange={setSpokenLang} />
        {sendError && <p className="text-sm text-destructive">{sendError}</p>}
      </TeacherConsole>
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="rounded-xl bg-zinc-950 p-5 text-center text-white">
          <p className="text-xs uppercase tracking-widest text-white/50">Learners join with code</p>
          <p className="font-mono text-5xl font-black tracking-[0.3em] text-amber-300">{room.code}</p>
          <p className="mt-2 break-all text-xs text-white/60">{joinUrl}</p>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold">Broadcast so far</h2>
          <ol className="flex max-h-80 flex-col-reverse gap-1.5 overflow-y-auto text-sm">
            {(phrases ?? []).map((p) => (
              <li key={p._id} className="rounded-lg border px-3 py-2">
                {p.text}
              </li>
            ))}
            {phrases?.length === 0 && <li className="text-muted-foreground">Nothing yet. Start talking.</li>}
          </ol>
        </div>
      </section>
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Class <span className="font-mono font-semibold text-foreground">{room.code}</span> · live
        </p>
        <SignLanguageSelect value={signLanguage} onChange={setSignLanguage} className="min-w-64" />
      </div>
      <LearnerScreen
        className="min-h-[60dvh]"
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
