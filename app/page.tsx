import { ClassroomLauncher } from "@/components/signbridge/classroom-launcher";
import { LiveTranslator } from "@/components/signbridge/live-translator";
import { SiteHeader } from "@/components/signbridge/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader>
        <span className="hidden text-[13px] text-white/45 sm:inline">SASL · NSL · KSL · ASL</span>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-4 lg:pt-8">
        <LiveTranslator />

        <section className="space-y-3 pb-10">
          <h2 className="text-[22px] font-semibold tracking-tight text-white">Whole-classroom mode</h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-white/55">
            The teacher&apos;s device listens. Each learner&apos;s phone signs the lesson in their own sign language: South African,
            Nigerian or Kenyan. No interpreter needed in the room.
          </p>
          <ClassroomLauncher />
        </section>
      </main>
    </>
  );
}
