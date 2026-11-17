import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0b0d]/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[520px] items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5 text-[21px] font-semibold tracking-tight text-white" aria-label="Rothe home">
          <Image src="/rothe-mark.png" alt="" width={32} height={32} priority className="size-8" />
          Rothe
        </Link>
        {children}
      </div>
    </header>
  );
}
