import Link from "next/link";
import type { ReactNode } from "react";
import { HandsIcon } from "./sign-stage";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-950 text-amber-300">
            <HandsIcon className="size-5" />
          </span>
          MASLink
        </Link>
        {children}
      </div>
    </header>
  );
}
