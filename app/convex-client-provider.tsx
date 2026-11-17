"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = url ? new ConvexReactClient(url) : null;

/** True when a Convex deployment is configured (classroom broadcast needs it; single-device mode does not). */
export const convexEnabled = convex !== null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return convex ? <ConvexProvider client={convex}>{children}</ConvexProvider> : <>{children}</>;
}
