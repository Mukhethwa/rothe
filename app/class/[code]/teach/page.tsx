import { Suspense } from "react";
import { AppShell } from "@/components/signbridge/app-shell";
import { TeachView } from "@/components/signbridge/classroom-views";

export default function TeachPage({ params }: PageProps<"/class/[code]/teach">) {
  return (
    <AppShell headerRight={<span className="text-[13px] text-white/45">Teacher</span>}>
      <Suspense fallback={<p className="p-8 text-center text-[15px] text-white/50">Loading…</p>}>
        <TeachView params={params} />
      </Suspense>
    </AppShell>
  );
}
