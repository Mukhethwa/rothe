import { z } from "zod";
import { SIGN_LANGUAGE_CODES, type SignLanguageCode } from "../types";

/** Shared by every AI provider so Claude and Gemini produce the same gloss shape. */

export const MAX_INPUT_CHARS = 600;

export const GlossRequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_INPUT_CHARS),
  sourceLang: z.string().trim().min(2).max(16),
  signLanguage: z.enum(SIGN_LANGUAGE_CODES),
});
export type GlossRequest = z.infer<typeof GlossRequestSchema>;

export const GlossOutputSchema = z.object({
  tokens: z.array(
    z.object({
      gloss: z.string().describe("Uppercase gloss; hyphenate multi-word signs, e.g. THANK-YOU"),
      kind: z.enum(["sign", "fingerspell"]),
    }),
  ),
  sentenceType: z.enum(["statement", "yes_no_question", "wh_question", "negation", "command"]),
  nonManual: z.string().describe("Short facial/body marker cue for the signer, e.g. 'eyebrows raised'"),
});
export type GlossOutput = z.infer<typeof GlossOutputSchema>;

/** Plain JSON Schema for providers that take one directly (Gemini). Keep in sync with GlossOutputSchema. */
export const GLOSS_JSON_SCHEMA = {
  type: "object",
  properties: {
    tokens: {
      type: "array",
      items: {
        type: "object",
        properties: {
          gloss: { type: "string", description: "Uppercase gloss; hyphenate multi-word signs, e.g. THANK-YOU" },
          kind: { type: "string", enum: ["sign", "fingerspell"] },
        },
        required: ["gloss", "kind"],
      },
    },
    sentenceType: { type: "string", enum: ["statement", "yes_no_question", "wh_question", "negation", "command"] },
    nonManual: { type: "string", description: "Short facial/body marker cue for the signer, e.g. 'eyebrows raised'" },
  },
  required: ["tokens", "sentenceType", "nonManual"],
} as const;

const LANGUAGE_NOTES: Record<SignLanguageCode, string> = {
  SASL: "South African Sign Language. Topic-comment order, time markers first, wh-words at the end, one-handed fingerspelling.",
  NSL: "Nigerian Sign Language (classroom variety, strong ASL lexical overlap). Time first, topic-comment, wh-words at the end.",
  KSL: "Kenyan Sign Language. Time first, topic-comment, wh-words at the end, one-handed fingerspelling.",
  ASL: "American Sign Language. Time-topic-comment, wh-words at the end, one-handed fingerspelling.",
};

export const SYSTEM_PROMPT = `You convert classroom speech into sign-language gloss for Deaf learners.
Rules:
- Output the meaning, not the words: drop articles, copulas, auxiliaries and filler ("um", "okay so").
- Reorder into the target sign language's grammar (time -> topic -> comment; wh-word last).
- Uppercase glosses. Use hyphens for multi-word signs (THANK-YOU, HOMEWORK).
- Prefer common base signs: LEARN for "studying".
- Tense comes from time signs, not verb endings: FINISH only for actions already completed; WILL or a time sign (TODAY, TOMORROW) for plans like "going to"; never add FINISH to a future or present sentence.
- Keep greetings and every content word that carries meaning (GOOD MORNING, names, subjects).
- kind="fingerspell" only for names, acronyms and technical terms with no established sign; everything else kind="sign".
- Input may be any spoken language (English, Spanish, French, isiZulu, code-switched). Always output target sign-language glosses.
- Keep it short: a Deaf learner must keep up with a live teacher.`;

export function buildUserMessage({ text, sourceLang, signLanguage }: GlossRequest): string {
  return `Target: ${LANGUAGE_NOTES[signLanguage]}\nSpoken language: ${sourceLang}\nTeacher said: """${text}"""`;
}

/** A provider failure with the HTTP status the route should return. */
export class ProviderError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
