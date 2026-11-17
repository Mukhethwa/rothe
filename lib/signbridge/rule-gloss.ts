import type { GlossResult, GlossToken, SentenceType } from "./types";

/**
 * Offline, rule-based gloss used when the AI endpoint is unreachable.
 * Deliberately simple (English-oriented): drop function words, move time
 * markers to the front and wh-words to the end, so the lesson never stalls.
 */

const DROP = new Set(
  "a an the is are am was were be been being to of do does did will shall would going gonna um uh okay ok so just please very really that this these those it its".split(" "),
);
const TIME = new Set(
  "today tomorrow yesterday now later morning afternoon tonight week monday tuesday wednesday thursday friday saturday sunday".split(" "),
);
const WH = new Set("what who where when why how which".split(" "));
const NEGATION = new Set(["not", "no", "never", "don't", "doesn't", "didn't", "can't", "won't", "isn't", "aren't"]);
const PRONOUNS: Record<string, string> = { i: "ME", me: "ME", my: "MY", we: "WE", us: "WE", you: "YOU", your: "YOUR" };
const SYNONYMS: Record<string, string> = {
  learning: "LEARN",
  learned: "LEARN",
  studying: "LEARN",
  study: "LEARN",
  finished: "FINISH",
  thanks: "THANK-YOU",
  hi: "HELLO",
  hey: "HELLO",
};

const NON_MANUAL: Record<SentenceType, string> = {
  statement: "Neutral face",
  yes_no_question: "Eyebrows raised, head tilted forward",
  wh_question: "Eyebrows furrowed",
  negation: "Head shake",
  command: "Firm gaze",
};

export function ruleGloss(text: string): GlossResult {
  const words = text
    .toLowerCase()
    .replace(/[“”"¿¡]/g, "")
    .split(/[\s,.;:!?]+/)
    .filter(Boolean);

  const time: GlossToken[] = [];
  const body: GlossToken[] = [];
  const wh: GlossToken[] = [];
  let negated = false;

  for (const word of words) {
    if (NEGATION.has(word)) {
      negated = true;
      body.push({ gloss: "NOT", kind: "sign" });
      continue;
    }
    if (DROP.has(word)) continue;
    const gloss = PRONOUNS[word] ?? SYNONYMS[word] ?? word.toUpperCase().replace(/[^\p{L}\p{N}'-]/gu, "");
    if (!gloss) continue;
    const token: GlossToken = { gloss, kind: "sign" };
    if (TIME.has(word)) time.push(token);
    else if (WH.has(word)) wh.push(token);
    else body.push(token);
  }

  const trimmed = text.trim();
  const isQuestion = trimmed.endsWith("?") || trimmed.startsWith("¿");
  let sentenceType: SentenceType = "statement";
  if (isQuestion) sentenceType = wh.length > 0 ? "wh_question" : "yes_no_question";
  else if (negated) sentenceType = "negation";

  return { tokens: [...time, ...body, ...wh], sentenceType, nonManual: NON_MANUAL[sentenceType], source: "offline" };
}
