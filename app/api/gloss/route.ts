/**
 * POST /api/gloss
 * Converts a spoken-language sentence into sign-language gloss tokens.
 *
 * Every configured provider is tried in order until one succeeds:
 *   Azure OpenAI (AZURE_OPENAI_*) -> Claude (ANTHROPIC_API_KEY) -> Gemini (GEMINI_API_KEY)
 * Runs server-side so API keys never reach the browser.
 */
import { azureOpenAIConfig, glossWithAzureOpenAI } from "@/lib/signbridge/server/azure-openai";
import { glossWithClaude } from "@/lib/signbridge/server/claude";
import { glossWithGemini } from "@/lib/signbridge/server/gemini";
import { GlossRequestSchema, ProviderError, type GlossOutput, type GlossRequest } from "@/lib/signbridge/server/gloss-prompt";

interface Provider {
  name: "azure-openai" | "claude" | "gemini";
  run: (req: GlossRequest) => Promise<GlossOutput>;
}

function configuredProviders(): Provider[] {
  const providers: Provider[] = [];
  const azure = azureOpenAIConfig();
  if (azure) providers.push({ name: "azure-openai", run: (req) => glossWithAzureOpenAI(req, azure) });
  if (process.env.ANTHROPIC_API_KEY) providers.push({ name: "claude", run: glossWithClaude });
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) providers.push({ name: "gemini", run: (req) => glossWithGemini(req, geminiKey) });
  return providers;
}

export async function POST(request: Request): Promise<Response> {
  const providers = configuredProviders();
  if (providers.length === 0) {
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

  let lastStatus = 502;
  for (const provider of providers) {
    try {
      const output = await provider.run(parsed.data);
      const tokens = output.tokens
        .map((t) => ({ ...t, gloss: t.gloss.trim().toUpperCase() }))
        .filter((t) => t.gloss.length > 0);
      return Response.json({ ...output, tokens, source: "ai", provider: provider.name }, { headers: { "cache-control": "no-store" } });
    } catch (err) {
      lastStatus = err instanceof ProviderError && err.status === 429 ? 429 : 502;
      console.error(`Gloss via ${provider.name} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return Response.json({ error: "Translation service unavailable" }, { status: lastStatus });
}
