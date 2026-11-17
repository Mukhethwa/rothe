import { Suspense } from "react";
import { AppShell } from "@/components/signbridge/app-shell";
import { LearnView } from "@/components/signbridge/classroom-views";

export default function LearnPage({ params }: PageProps<"/class/[code]">) {
  return (
    <AppShell headerRight={<span className="text-[13px] text-white/45">Learner</span>}>
      <Suspense fallback={<p className="p-8 text-center text-[15px] text-white/50">Loading…</p>}>
        <LearnView params={params} />
      </Suspense>
    </AppShell>
  );
}
