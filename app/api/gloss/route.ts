/**
 * POST /api/gloss
 * Converts a spoken-language sentence into sign-language gloss tokens using Claude.
 * Runs server-side so the Anthropic API key never reaches the browser.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { SIGN_LANGUAGE_CODES, type SignLanguageCode } from "@/lib/signbridge/types";

const MAX_INPUT_CHARS = 600;
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

const RequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_INPUT_CHARS),
  sourceLang: z.string().trim().min(2).max(16),
  signLanguage: z.enum(SIGN_LANGUAGE_CODES),
});

const GlossSchema = z.object({
  tokens: z.array(
    z.object({
      gloss: z.string().describe("Uppercase gloss; hyphenate multi-word signs, e.g. THANK-YOU"),
      kind: z.enum(["sign", "fingerspell"]),
    }),
  ),
  sentenceType: z.enum(["statement", "yes_no_question", "wh_question", "negation", "command"]),
  nonManual: z.string().describe("Short facial/body marker cue for the signer, e.g. 'eyebrows raised'"),
});

const LANGUAGE_NOTES: Record<SignLanguageCode, string> = {
  SASL: "South African Sign Language. Topic-comment order, time markers first, wh-words at the end, one-handed fingerspelling.",
  NSL: "Nigerian Sign Language (classroom variety, strong ASL lexical overlap). Time first, topic-comment, wh-words at the end.",
  KSL: "Kenyan Sign Language. Time first, topic-comment, wh-words at the end, one-handed fingerspelling.",
  ASL: "American Sign Language. Time-topic-comment, wh-words at the end, one-handed fingerspelling.",
};

const SYSTEM_PROMPT = `You convert classroom speech into sign-language gloss for Deaf learners.
Rules:
- Output the meaning, not the words: drop articles, copulas, auxiliaries and filler ("um", "okay so").
- Reorder into the target sign language's grammar (time -> topic -> comment; wh-word last).
- Uppercase glosses. Use hyphens for multi-word signs (THANK-YOU, HOMEWORK).
- Prefer common base signs: LEARN for "studying", FINISH for completed actions.
- kind="fingerspell" only for names, acronyms and technical terms with no established sign; everything else kind="sign".
- Input may be any spoken language (English, Spanish, French, isiZulu, code-switched). Always output target sign-language glosses.
- Keep it short: a Deaf learner must keep up with a live teacher.`;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ timeout: 15_000, maxRetries: 1 });
  return client;
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Client falls back to the offline engine.
    return Response.json({ error: "AI translation not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Expected { text, sourceLang, signLanguage }" }, { status: 400 });
  }
  const { text, sourceLang, signLanguage } = parsed.data;

  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 2048,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(GlossSchema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Target: ${LANGUAGE_NOTES[signLanguage]}\nSpoken language: ${sourceLang}\nTeacher said: """${text}"""`,
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ error: "No usable gloss returned" }, { status: 502 });
    }

    const tokens = response.parsed_output.tokens
      .map((t) => ({ ...t, gloss: t.gloss.trim().toUpperCase() }))
      .filter((t) => t.gloss.length > 0);

    return Response.json({ ...response.parsed_output, tokens, source: "ai" }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return Response.json({ error: "Translation service unavailable" }, { status: 502 });
    }
    console.error("Unexpected gloss error", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
