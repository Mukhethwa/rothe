import { Suspense } from "react";
import { LearnView } from "@/components/signbridge/classroom-views";
import { SiteHeader } from "@/components/signbridge/site-header";

export default function LearnPage({ params }: PageProps<"/class/[code]">) {
  return (
    <>
      <SiteHeader>
        <span className="text-xs text-muted-foreground">Learner screen</span>
      </SiteHeader>
      <main className="flex w-full flex-1 flex-col px-4 py-4">
        <Suspense fallback={<p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>}>
          <LearnView params={params} />
        </Suspense>
      </main>
    </>
  );
}
