import { ClassroomLauncher } from "@/components/signbridge/classroom-launcher";
import { LiveTranslator } from "@/components/signbridge/live-translator";
import { SiteHeader } from "@/components/signbridge/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader>
        <span className="hidden text-xs text-muted-foreground sm:inline">SASL · NSL · KSL · ASL</span>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:py-10">
        <section className="max-w-3xl space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            The teacher speaks. The Deaf learner sees it signed, in their own sign language.
          </h1>
          <p className="text-muted-foreground text-pretty">
            MASLink turns live classroom speech in English, Spanish, French or isiZulu into sign-language grammar (not word-for-word)
            and plays it as a sign sequence, with fingerspelling for names and new terms.
          </p>
        </section>

        <LiveTranslator />

        <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Whole-classroom mode</h2>
            <p className="text-sm text-muted-foreground">
              The teacher&apos;s device listens; each learner&apos;s phone or tablet signs the lesson in South African, Nigerian or Kenyan
              Sign Language. No interpreter needed in the room.
            </p>
          </div>
          <ClassroomLauncher />
        </section>
      </main>
    </>
  );
}
