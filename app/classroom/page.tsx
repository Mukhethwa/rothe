import { AppShell } from "@/components/signbridge/app-shell";
import { ClassroomLauncher } from "@/components/signbridge/classroom-launcher";

export default function ClassroomPage() {
  return (
    <AppShell>
      <section className="flex flex-col gap-4 pt-1">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold tracking-tight text-white">Classroom</h1>
          <p className="mt-1 text-[15px] leading-relaxed text-white/55">
            The teacher&apos;s phone listens. Every learner&apos;s phone signs the lesson in their own sign language. Rothe means
            &ldquo;all of us&rdquo; in Tshivenda.
          </p>
        </div>
        <ClassroomLauncher />
      </section>
    </AppShell>
  );
}
