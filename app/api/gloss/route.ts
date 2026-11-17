/**
 * POST /api/gloss
 * Converts a spoken-language sentence into sign-language gloss tokens.
 * Uses Claude when ANTHROPIC_API_KEY is set, otherwise Gemini (GEMINI_API_KEY).
 * Runs server-side so API keys never reach the browser.
 */
import { glossWithClaude } from "@/lib/signbridge/server/claude";
import { glossWithGemini } from "@/lib/signbridge/server/gemini";
import { GlossRequestSchema, ProviderError, type GlossOutput, type GlossRequest } from "@/lib/signbridge/server/gloss-prompt";

type Provider = { name: "claude" | "gemini"; run: (req: GlossRequest) => Promise<GlossOutput> };

function pickProvider(): Provider | null {
  if (process.env.ANTHROPIC_API_KEY) return { name: "claude", run: glossWithClaude };
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) return { name: "gemini", run: (req) => glossWithGemini(req, geminiKey) };
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const provider = pickProvider();
  if (!provider) {
    // The client falls back to its offline engine and tells the user why.
    return Response.json({ error: "AI translation not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = GlossRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Expected { text, sourceLang, signLanguage }" }, { status: 400 });
  }

  try {
    const output = await provider.run(parsed.data);
    const tokens = output.tokens
      .map((t) => ({ ...t, gloss: t.gloss.trim().toUpperCase() }))
      .filter((t) => t.gloss.length > 0);
    return Response.json({ ...output, tokens, source: "ai", provider: provider.name }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error(`Gloss via ${provider.name} failed:`, err instanceof Error ? err.message : err);
    const status = err instanceof ProviderError && err.status === 429 ? 429 : 502;
    return Response.json({ error: "Translation service unavailable" }, { status });
  }
}
