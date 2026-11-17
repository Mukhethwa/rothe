import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { buildUserMessage, GlossOutputSchema, ProviderError, SYSTEM_PROMPT, type GlossOutput, type GlossRequest } from "./gloss-prompt";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ timeout: 15_000, maxRetries: 1 });
  return client;
}

export async function glossWithClaude(req: GlossRequest): Promise<GlossOutput> {
  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 2048,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(GlossOutputSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(req) }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new ProviderError(502, "Claude returned no usable gloss");
    }
    return response.parsed_output;
  } catch (err) {
    if (err instanceof Anthropic.APIError) throw new ProviderError(502, `Claude API error ${err.status}: ${err.message}`);
    throw err;
  }
}
