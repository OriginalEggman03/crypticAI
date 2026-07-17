import { isBlockedHomophoneWord } from "./homophone-content-filter";
import {
  areInflectionalVariants,
  haveSameCachedDefinition,
} from "./homophone-meaning";
import {
  haveIdenticalSpelling,
  normalizeHomophoneSpelling,
  stripDiacritics,
} from "./homophone-spelling";

export {
  formatHomophoneLexemeDisplay,
  haveIdenticalSpelling,
  normalizeHomophoneSpelling,
  stripDiacritics,
} from "./homophone-spelling";

/**
 * Detect spelling variants that share meaning (blond/blonde, grey/gray,
 * café/cafe, cream/crème) vs true homophones with different meanings
 * (meat/meet, bell/belle).
 */

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function endsWithDoubledConsonant(word: string): boolean {
  return word.length >= 2 && word.at(-1) === word.at(-2) && word.at(-1)! >= "a" && word.at(-1)! <= "z";
}

/** British/American and other same-meaning orthographic normalizations. */
export function normalizeSpellingVariantKey(word: string): string {
  let s = word.toLowerCase();

  s = s.replace(/grey/g, "gray");
  s = s.replace(/ae/g, "e").replace(/oe/g, "e");
  s = s.replace(/cheque/g, "check");
  s = s.replace(/draught/g, "draft");
  s = s.replace(/dialogue/g, "dialog");
  s = s.replace(/catalogue/g, "catalog");
  s = s.replace(/monologue/g, "monolog");
  s = s.replace(/hiccough/g, "hiccup");
  s = s.replace(/plough/g, "plow");
  s = s.replace(/sceptic/g, "skeptic");
  s = s.replace(/enquir/g, "inquir");
  // UK verb spelling before general -ise → -ize (practise → practice, not practize)
  s = s.replace(/practise\b/g, "practice");
  s = s.replace(/([bcdfghjklmnpqrstvwxz])our\b/g, "$1or");
  s = s.replace(/([bcdfghjklmnpqrstvwxz])yse\b/g, "$1yze");
  s = s.replace(/([bcdfghjklmnpqrstvwxz])ence\b/g, "$1ense");
  s = s.replace(/([bcdfghjklmnpqrstvwxz])ise\b/g, "$1ize");
  s = s.replace(/([bcdfghjklmnpqrstvwxz])re\b/g, "$1er");
  s = s.replace(/([bcdfghjklmnpqrstvwxz])y(er|est)\b/g, "$1ie$2");

  if (s === "disc") s = "disk";
  if (s === "gaol") s = "jail";
  if (s === "bluish" || s === "blueish") s = "blueish";
  if (s === "drier" || s === "dryer") s = "dryer";
  if (s === "descendent") s = "descendant";
  if (s === "guaranty") s = "guarantee";

  return s;
}

function prefixPlusTrailingE(a: string, b: string): boolean {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (longer.length !== shorter.length + 1) return false;
  if (!longer.endsWith("e") || shorter.endsWith("e")) return false;
  if (!longer.startsWith(shorter)) return false;
  if (endsWithDoubledConsonant(shorter)) return false;
  return shorter.length >= 3;
}

function prefixPlusFeminineSuffix(a: string, b: string): boolean {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (!longer.startsWith(shorter)) return false;
  const extra = longer.slice(shorter.length);
  if (extra === "e" && !endsWithDoubledConsonant(shorter)) return shorter.length >= 4;
  if (extra === "te" && longer.endsWith("ette")) return shorter.endsWith("t") || shorter.endsWith("et");
  if (extra === "ette") return true;
  return false;
}

function ishSpellingVariant(a: string, b: string): boolean {
  if (!a.endsWith("ish") || !b.endsWith("ish")) return false;
  const stemA = a.slice(0, -3);
  const stemB = b.slice(0, -3);
  if (stemA.length < 2 || stemB.length < 2) return false;
  return levenshtein(stemA, stemB) <= 1 && Math.abs(stemA.length - stemB.length) <= 1;
}

/**
 * French loanword anglicizations where English keeps "ea" but the French
 * form uses a single "e" (cream/crème → creme). Skips native pairs like
 * bread/bred where collapsing "ea" already yields the other word.
 */
function anglicizedVowelDigraphVariant(a: string, b: string): boolean {
  if (a.length < 5 || b.length < 5) return false;
  if (Math.abs(a.length - b.length) > 1) return false;

  const collapseEa = (word: string) => word.replace(/ea/g, "e");

  for (const [withEa, other] of [
    [a, b] as const,
    [b, a] as const,
  ]) {
    if (!withEa.includes("ea")) continue;
    const collapsed = collapseEa(withEa);
    if (collapsed === other) continue;
    if (collapsed.length >= 4 && prefixPlusTrailingE(collapsed, other)) {
      return true;
    }
  }

  return false;
}

/** True when two words differ only by diacritical marks. */
function areDiacriticVariants(a: string, b: string): boolean {
  const foldedA = stripDiacritics(a).toLowerCase().replace(/[^a-z]/g, "");
  const foldedB = stripDiacritics(b).toLowerCase().replace(/[^a-z]/g, "");
  return Boolean(foldedA && foldedB && foldedA === foldedB);
}

/** True when two words are alternate spellings with the same meaning. */
export function areSpellingVariants(a: string, b: string): boolean {
  const wa = normalizeHomophoneSpelling(a);
  const wb = normalizeHomophoneSpelling(b);
  if (!wa || !wb || wa === wb) return wa === wb;

  if (normalizeSpellingVariantKey(wa) === normalizeSpellingVariantKey(wb)) return true;
  if (areDiacriticVariants(a, b)) return true;
  if (prefixPlusTrailingE(wa, wb)) return true;
  if (prefixPlusFeminineSuffix(wa, wb)) return true;
  if (ishSpellingVariant(wa, wb)) return true;
  if (anglicizedVowelDigraphVariant(wa, wb)) return true;

  return false;
}

/** True when two words share meaning (spelling variant, inflection, or same gloss). */
export function haveSameMeaning(a: string, b: string): boolean {
  const wa = normalizeHomophoneSpelling(a);
  const wb = normalizeHomophoneSpelling(b);
  if (!wa || !wb) return false;
  if (haveIdenticalSpelling(a, b)) return true;
  if (areSpellingVariants(wa, wb)) return true;
  if (areInflectionalVariants(wa, wb)) return true;
  return haveSameCachedDefinition(wa, wb);
}

function canonicalRejectedPairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Cognate pairs with related senses — sound-alike but too close for cryptic homophones. */
const REJECTED_HOMOPHONE_PAIRS = new Set([
  canonicalRejectedPairKey("populace", "populous"),
]);

/** True when answer and fodder sound alike but mean different things. */
export function isDistinctHomophonePair(answer: string, fodder: string): boolean {
  const a = normalizeHomophoneSpelling(answer);
  const b = normalizeHomophoneSpelling(fodder);
  if (!a || !b || haveIdenticalSpelling(answer, fodder)) return false;
  if (isBlockedHomophoneWord(a) || isBlockedHomophoneWord(b)) return false;
  if (REJECTED_HOMOPHONE_PAIRS.has(canonicalRejectedPairKey(a, b))) return false;
  return !haveSameMeaning(a, b);
}

/** Remove same-meaning words within a homophone group, keeping one representative per cluster. */
export function filterHomophoneGroupWords(words: string[]): string[] {
  const sorted = [...words].sort((a, b) => a.localeCompare(b));
  const kept: string[] = [];

  for (const word of sorted) {
    if (kept.some((rep) => haveSameMeaning(rep, word))) continue;
    kept.push(word);
  }

  return kept;
}
