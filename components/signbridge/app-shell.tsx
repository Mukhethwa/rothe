import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { TabBar } from "./tab-bar";

/** Phone-width column on every screen size (mobile-first app view), with a bottom tab bar. */
export const APP_WIDTH = "max-w-[520px]";

export function AppShell({ children, headerRight }: { children: ReactNode; headerRight?: ReactNode }) {
  return (
    <>
      <SiteHeader>{headerRight}</SiteHeader>
      <main className={`mx-auto flex w-full ${APP_WIDTH} flex-1 flex-col px-4 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom))]`}>
        {children}
      </main>
      <TabBar />
    </>
  );
}
