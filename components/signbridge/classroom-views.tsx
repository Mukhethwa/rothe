"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useClassroomChannel, type ChannelStatus } from "@/hooks/use-classroom-channel";
import { useSignQueue } from "@/hooks/use-sign-queue";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { isValidCode, normaliseCode, type ClassroomPhrase } from "@/lib/signbridge/classroom";
import type { SignLanguageCode } from "@/lib/signbridge/types";
import { cn } from "@/lib/utils";
import { LearnerScreen } from "./learner-screen";
import { lastFinishedOf, statusOf } from "./live-translator";
import { StatusPill } from "./site-header";
import { TeacherConsole } from "./teacher-console";
import { card, LanguageBar } from "./teacher-controls";

type CodeParams = Promise<{ code: string }>;

const noopSubscribe = () => () => {};

const CHANNEL_LABEL: Record<ChannelStatus, { text: string; dot: string }> = {
  connecting: { text: "Connecting…", dot: "bg-sky-400 animate-pulse" },
  live: { text: "Connected", dot: "bg-emerald-400" },
  reconnecting: { text: "Reconnecting…", dot: "bg-amber-400 animate-pulse" },
  unavailable: { text: "Offline", dot: "bg-red-400" },
};

function ChannelPill({ status }: { status: ChannelStatus }) {
  const s = CHANNEL_LABEL[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-[13px] font-medium text-white/80" role="status">
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {s.text}
    </span>
  );
}

function InvalidCode({ code }: { code: string }) {
  return (
    <div className={cn(card, "mt-2 p-6 text-center")}>
      <p className="text-[17px] font-semibold text-white">“{code}” isn&apos;t a classroom code</p>
      <p className="mt-1 text-[15px] text-white/55">Codes are 5 letters/numbers, shown on the teacher&apos;s screen.</p>
      <Link href="/classroom" className="mt-4 inline-block text-[15px] font-medium text-emerald-300">
        Try again
      </Link>
    </div>
  );
}

function useRoomCode(params: CodeParams): string {
  const { code } = use(params);
  return normaliseCode(decodeURIComponent(code));
}

export function TeachView({ params }: { params: CodeParams }) {
  const code = useRoomCode(params);
  return isValidCode(code) ? <TeachRoom code={code} /> : <InvalidCode code={code} />;
}

function TeachRoom({ code }: { code: string }) {
  const { status, error, send } = useClassroomChannel(code, "teacher");
  const [sent, setSent] = useState<ClassroomPhrase[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const joinUrl = `${origin}/class/${code}`;

  const onPhrase = useCallback(
    (text: string, lang: string) => {
      const phrase: ClassroomPhrase = { id: crypto.randomUUID(), text: text.trim(), lang, at: Date.now() };
      if (!phrase.text) return;
      if (send(phrase)) {
        setSendError(null);
        setSent((list) => [...list, phrase].slice(-30));
      } else {
        setSendError("Not connected to the classroom yet. Try again in a moment.");
      }
    },
    [send],
  );

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-semibold tracking-tight text-white">Teaching</h1>
        <ChannelPill status={status} />
      </div>
      <section className="rounded-[28px] border border-white/[0.08] bg-[radial-gradient(120%_80%_at_50%_0%,#24303a_0%,#14181d_60%)] p-6 text-center">
        <p className="text-[12px] font-semibold tracking-[0.12em] text-white/50 uppercase">Learners join with code</p>
        <p className="mt-1 font-mono text-5xl font-bold tracking-[0.3em] text-emerald-300">{code}</p>
        <p className="mt-2 text-[13px] break-all text-white/50">{joinUrl}</p>
      </section>
      <TeacherConsole onPhrase={onPhrase} lastSaid={sent.at(-1)?.text ?? null} />
      {(sendError || error) && <p className="rounded-2xl bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">{sendError ?? error}</p>}
      {sent.length > 0 && (
        <section className={cn(card, "px-4 py-3.5")}>
          <p className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-white/45 uppercase">Sent to learners</p>
          <ol className="flex max-h-60 flex-col-reverse divide-y divide-y-reverse divide-white/[0.06] overflow-y-auto">
            {sent.map((p) => (
              <li key={p.id} className="py-2 text-[15px] text-white/85">
                {p.text}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export function LearnView({ params }: { params: CodeParams }) {
  const code = useRoomCode(params);
  return isValidCode(code) ? <LearnRoom code={code} /> : <InvalidCode code={code} />;
}

function LearnRoom({ code }: { code: string }) {
  const [signLanguage, setSignLanguage] = useState<SignLanguageCode>("SASL");
  const queue = useSignQueue();
  const { enqueue } = queue;
  const signLanguageRef = useRef(signLanguage);
  useEffect(() => {
    signLanguageRef.current = signLanguage;
  }, [signLanguage]);
  useWakeLock(true);

  // Each learner's phone translates into its own chosen sign language.
  const onPhrase = useCallback((p: ClassroomPhrase) => enqueue(p.text, p.lang, signLanguageRef.current, p.id), [enqueue]);
  const { status } = useClassroomChannel(code, "learner", onPhrase);

  const lastFinished = useMemo(() => lastFinishedOf(queue.utterances), [queue.utterances]);

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-white/50">
          Class <span className="font-mono font-semibold text-white">{code}</span>
        </p>
        <div className="flex items-center gap-2">
          <ChannelPill status={status} />
          <StatusPill status={statusOf(false, queue.utterances, !!queue.current)} />
        </div>
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
      {status === "live" && queue.utterances.length === 0 && (
        <p className="text-center text-[14px] text-white/45">Connected. Signs appear as soon as the teacher speaks.</p>
      )}
    </div>
  );
}
