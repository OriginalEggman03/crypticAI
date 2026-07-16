/**
 * Client-safe homophone spelling helpers (no Node/fs imports).
 */

/** Fold accented characters to ASCII (résumé → resume, naïve → naive). */
export function stripDiacritics(word: string): string {
  return word.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Lowercase a-z spelling key used for homophone pair identity checks. */
export function normalizeHomophoneSpelling(word: string): string {
  return stripDiacritics(word).toLowerCase().replace(/[^a-z]/g, "");
}

/** Preserve full spelling in UI — avoids SCHILLING/shilling both reading as "Shilling". */
export function formatHomophoneLexemeDisplay(word: string): string {
  return normalizeHomophoneSpelling(word);
}

/** True when two tokens normalize to the same spelling (case and punctuation insensitive). */
export function haveIdenticalSpelling(a: string, b: string): boolean {
  const wa = normalizeHomophoneSpelling(a);
  const wb = normalizeHomophoneSpelling(b);
  return Boolean(wa && wb && wa === wb);
}
