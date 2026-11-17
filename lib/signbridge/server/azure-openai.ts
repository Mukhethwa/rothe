import { buildUserMessage, GlossOutputSchema, ProviderError, SYSTEM_PROMPT, type GlossOutput, type GlossRequest } from "./gloss-prompt";

/**
 * Azure OpenAI chat completions with strict JSON-schema structured output.
 * Env: AZURE_OPENAI_ENDPOINT (https://<resource>.openai.azure.com), AZURE_OPENAI_API_KEY,
 *      AZURE_OPENAI_DEPLOYMENT (your deployment name), optional AZURE_OPENAI_API_VERSION.
 */

const DEFAULT_API_VERSION = "2024-10-21";
const REQUEST_TIMEOUT_MS = 6_000;

// Strict structured outputs require every property listed in `required` and no extra properties.
const STRICT_GLOSS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tokens", "sentenceType", "nonManual"],
  properties: {
    tokens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["gloss", "kind"],
        properties: {
          gloss: { type: "string", description: "Uppercase gloss; hyphenate multi-word signs, e.g. THANK-YOU" },
          kind: { type: "string", enum: ["sign", "fingerspell"] },
        },
      },
    },
    sentenceType: { type: "string", enum: ["statement", "yes_no_question", "wh_question", "negation", "command"] },
    nonManual: { type: "string", description: "Short facial/body marker cue for the signer, e.g. 'eyebrows raised'" },
  },
} as const;

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
}

export function azureOpenAIConfig(): AzureOpenAIConfig | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim().replace(/\/+$/, "");
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim();
  if (!endpoint || !apiKey || !deployment) return null;
  return { endpoint, apiKey, deployment, apiVersion: process.env.AZURE_OPENAI_API_VERSION?.trim() || DEFAULT_API_VERSION };
}

interface ChatCompletion {
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
  error?: { code?: string; message?: string };
}

export async function glossWithAzureOpenAI(req: GlossRequest, cfg: AzureOpenAIConfig): Promise<GlossOutput> {
  const url = `${cfg.endpoint}/openai/deployments/${encodeURIComponent(cfg.deployment)}/chat/completions?api-version=${encodeURIComponent(cfg.apiVersion)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "api-key": cfg.apiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(req) },
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_schema", json_schema: { name: "sign_gloss", strict: true, schema: STRICT_GLOSS_SCHEMA } },
      }),
    });
  } catch (err) {
    throw new ProviderError(504, `Azure OpenAI request failed: ${(err as Error).message}`);
  }

  const data = (await res.json().catch(() => ({}))) as ChatCompletion;
  if (!res.ok) throw new ProviderError(res.status, `Azure OpenAI HTTP ${res.status}: ${data.error?.code ?? ""} ${data.error?.message ?? ""}`.trim());

  const message = data.choices?.[0]?.message;
  if (message?.refusal) throw new ProviderError(502, "Azure OpenAI refused the request");
  let json: unknown;
  try {
    json = JSON.parse(message?.content ?? "");
  } catch {
    throw new ProviderError(502, `Azure OpenAI returned non-JSON output (finish_reason: ${data.choices?.[0]?.finish_reason ?? "unknown"})`);
  }
  const parsed = GlossOutputSchema.safeParse(json);
  if (!parsed.success) throw new ProviderError(502, "Azure OpenAI output did not match the gloss schema");
  return parsed.data;
}
