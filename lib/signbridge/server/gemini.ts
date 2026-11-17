import { buildUserMessage, GLOSS_JSON_SCHEMA, GlossOutputSchema, ProviderError, SYSTEM_PROMPT, type GlossOutput, type GlossRequest } from "./gloss-prompt";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Lite models answer in ~2s, which matters more than depth for live classroom speech.
// The second model is tried when the first is overloaded or rate-limited.
const DEFAULT_MODELS = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite"];
const REQUEST_TIMEOUT_MS = 4_500; // per model; keeps two attempts inside the client's 10s budget

function modelsToTry(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  return configured ? [configured, ...DEFAULT_MODELS.filter((m) => m !== configured)] : DEFAULT_MODELS;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  error?: { code?: number; message?: string };
}

async function callModel(model: string, apiKey: string, req: GlossRequest): Promise<GlossOutput> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: buildUserMessage(req) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: GLOSS_JSON_SCHEMA,
        temperature: 0.2,
      },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (!res.ok) throw new ProviderError(res.status, data.error?.message ?? `Gemini HTTP ${res.status}`);

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ProviderError(502, `Gemini returned non-JSON output (finishReason: ${data.candidates?.[0]?.finishReason ?? "unknown"})`);
  }
  const parsed = GlossOutputSchema.safeParse(json);
  if (!parsed.success) throw new ProviderError(502, "Gemini output did not match the gloss schema");
  return parsed.data;
}

/** Translate with Gemini, falling through to the next model on overload, rate limit or a retired model. */
export async function glossWithGemini(req: GlossRequest, apiKey: string): Promise<GlossOutput> {
  let lastError: unknown;
  for (const model of modelsToTry()) {
    try {
      return await callModel(model, apiKey, req);
    } catch (err) {
      lastError = err;
      const status = err instanceof ProviderError ? err.status : 0;
      const tryNext = status === 404 || status === 429 || status >= 500 || status === 0;
      console.warn(`Gemini model ${model} failed (${status || "network"}): ${(err as Error).message}`);
      if (!tryNext) break;
    }
  }
  throw lastError instanceof ProviderError ? lastError : new ProviderError(502, "Gemini unavailable");
}
