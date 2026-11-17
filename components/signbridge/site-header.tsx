import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HandsIcon } from "./sign-stage";

export type AppStatus = "ready" | "listening" | "translating" | "signing";

const STATUS: Record<AppStatus, { label: string; dot: string }> = {
  ready: { label: "Ready", dot: "bg-white/40" },
  listening: { label: "Listening", dot: "bg-red-400 animate-pulse" },
  translating: { label: "Translating", dot: "bg-sky-400 animate-pulse" },
  signing: { label: "Signing", dot: "bg-emerald-400 animate-pulse" },
};

export function StatusPill({ status }: { status: AppStatus }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-[13px] font-medium text-white/80" role="status">
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0b0d]/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 text-[19px] font-semibold tracking-tight text-white">
          <HandsIcon className="size-6 text-emerald-400" />
          MASLink <span className="font-normal text-white/45">Live</span>
        </Link>
        {children}
      </div>
    </header>
  );
}
