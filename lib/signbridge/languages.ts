import type { SignLanguageCode } from "./types";

export interface SignLanguageInfo {
  code: SignLanguageCode;
  name: string;
  flag: string;
}

export const SIGN_LANGUAGES: readonly SignLanguageInfo[] = [
  { code: "SASL", name: "South African Sign Language", flag: "🇿🇦" },
  { code: "NSL", name: "Nigerian Sign Language", flag: "🇳🇬" },
  { code: "KSL", name: "Kenyan Sign Language", flag: "🇰🇪" },
  { code: "ASL", name: "American Sign Language", flag: "🇺🇸" },
];

export interface SpokenLanguageInfo {
  /** BCP-47 tag passed to the Web Speech API. */
  tag: string;
  label: string;
}

export const SPOKEN_LANGUAGES: readonly SpokenLanguageInfo[] = [
  { tag: "en-ZA", label: "English (South Africa)" },
  { tag: "en-NG", label: "English (Nigeria)" },
  { tag: "en-KE", label: "English (Kenya)" },
  { tag: "en-US", label: "English (US)" },
  { tag: "es-ES", label: "Spanish" },
  { tag: "fr-FR", label: "French" },
  { tag: "zu-ZA", label: "isiZulu" },
  { tag: "af-ZA", label: "Afrikaans" },
  { tag: "sw-KE", label: "Kiswahili" },
];

export function signLanguageInfo(code: SignLanguageCode): SignLanguageInfo {
  return SIGN_LANGUAGES.find((l) => l.code === code) ?? SIGN_LANGUAGES[0];
}

export interface DemoPrompt {
  label: string;
  text: string;
  lang: string;
}

export const DEMO_PROMPTS: readonly DemoPrompt[] = [
  { label: "Greeting", text: "Good morning class, today we are going to learn about electricity.", lang: "en-ZA" },
  { label: "Math question", text: "Do you understand the math question on the board?", lang: "en-ZA" },
  { label: "Homework", text: "Please finish your homework before Friday.", lang: "en-NG" },
  { label: "Spanish science", text: "¿Qué es la fotosíntesis? Las plantas usan la luz del sol.", lang: "es-ES" },
];
