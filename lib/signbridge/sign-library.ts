import type { SignLanguageCode } from "./types";

/**
 * Sign media library, loaded from /signs/manifest.json so clips can be added
 * without a code change: drop a file into public/signs/<lang>/ and list it.
 *
 *   { "SASL": { "signs": { "HELLO": "sasl/hello.mp4" }, "alphabet": { "A": "sasl/alphabet/a.png" } } }
 */
export interface LanguagePack {
  signs: Record<string, string>;
  alphabet: Record<string, string>;
}

export type SignManifest = Partial<Record<SignLanguageCode, Partial<LanguagePack>>>;

let manifestPromise: Promise<SignManifest> | null = null;

export function loadManifest(): Promise<SignManifest> {
  manifestPromise ??= fetch("/signs/manifest.json")
    .then((r) => (r.ok ? (r.json() as Promise<SignManifest>) : {}))
    .catch(() => ({}));
  return manifestPromise;
}

export function packFor(manifest: SignManifest, lang: SignLanguageCode): LanguagePack {
  const pack = manifest[lang];
  return { signs: pack?.signs ?? {}, alphabet: pack?.alphabet ?? {} };
}

export function mediaUrl(path: string): string {
  return path.startsWith("http") || path.startsWith("/") ? path : `/signs/${path}`;
}

export function isVideo(path: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(path);
}
