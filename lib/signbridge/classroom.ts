/** Shared classroom-code rules (client and server). */

// No 0/O/1/I so codes are easy to read aloud and type on a phone.
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 5;
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

export function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/** What the teacher's phone broadcasts to the room for each finished sentence. */
export interface ClassroomPhrase {
  id: string;
  text: string;
  lang: string;
  at: number;
}

export function isClassroomPhrase(value: unknown): value is ClassroomPhrase {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<ClassroomPhrase>;
  return typeof v.id === "string" && typeof v.text === "string" && typeof v.lang === "string" && typeof v.at === "number";
}
