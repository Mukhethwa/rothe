import { Suspense } from "react";
import { TeachView } from "@/components/signbridge/classroom-views";
import { SiteHeader } from "@/components/signbridge/site-header";

export default function TeachPage({ params }: PageProps<"/class/[code]/teach">) {
  return (
    <>
      <SiteHeader>
        <span className="text-xs text-muted-foreground">Teacher console</span>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">
        <Suspense fallback={<p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>}>
          <TeachView params={params} />
        </Suspense>
      </main>
    </>
  );
}
