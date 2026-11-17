import { ruleGloss } from "./rule-gloss";
import type { GlossResult, SignLanguageCode } from "./types";

const REQUEST_TIMEOUT_MS = 10_000;

function isGlossResult(value: unknown): value is GlossResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<GlossResult>;
  return Array.isArray(v.tokens) && typeof v.sentenceType === "string" && typeof v.nonManual === "string";
}

/**
 * Translate speech text into sign gloss via /api/gloss. Falls back to the offline
 * rule engine on any network/API failure so a live lesson (or a demo) never stalls.
 */
export async function fetchGloss(text: string, sourceLang: string, signLanguage: SignLanguageCode): Promise<GlossResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch("/api/gloss", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, sourceLang, signLanguage }),
      signal: controller.signal,
    });
    if (res.status === 503) return { ...ruleGloss(text), fallbackReason: "not_configured" };
    if (!res.ok) throw new Error(`Gloss API ${res.status}`);
    const data: unknown = await res.json();
    if (!isGlossResult(data) || data.tokens.length === 0) throw new Error("Malformed gloss response");
    return { ...data, source: "ai" };
  } catch (err) {
    console.warn("AI gloss unavailable, using offline engine:", err);
    return { ...ruleGloss(text), fallbackReason: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
