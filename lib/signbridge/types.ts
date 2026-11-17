export const SIGN_LANGUAGE_CODES = ["SASL", "NSL", "KSL", "ASL"] as const;
export type SignLanguageCode = (typeof SIGN_LANGUAGE_CODES)[number];

export type TokenKind = "sign" | "fingerspell";

export interface GlossToken {
  gloss: string;
  kind: TokenKind;
}

export type SentenceType = "statement" | "yes_no_question" | "wh_question" | "negation" | "command";

export interface GlossResult {
  tokens: GlossToken[];
  sentenceType: SentenceType;
  nonManual: string;
  /** "ai" = Claude translation, "offline" = local rule-based fallback. */
  source: "ai" | "offline";
}

export type UtteranceStatus = "translating" | "ready" | "playing" | "done";

export interface Utterance {
  id: string;
  text: string;
  sourceLang: string;
  signLanguage: SignLanguageCode;
  status: UtteranceStatus;
  result?: GlossResult;
}
