import { AppShell } from "@/components/signbridge/app-shell";
import { LiveTranslator } from "@/components/signbridge/live-translator";

export default function Home() {
  return (
    <AppShell>
      <LiveTranslator />
    </AppShell>
  );
}
