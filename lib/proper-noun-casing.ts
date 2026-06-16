import {
  applyDictionaryProperNounCasing,
  canonicalCapitalForm,
  requiresCapitalizationInClue,
} from "./dictionary-proper-nouns";
import { fodderTokens } from "./fodder-surface";
import {
  FAMOUS_FODDER_PROPER_NAMES,
  PLACE_FODDER_WORDS,
} from "./proper-noun-words";

export { FAMOUS_FODDER_PROPER_NAMES, PLACE_FODDER_WORDS } from "./proper-noun-words";
export {
  applyDictionaryProperNounCasing,
  canonicalCapitalForm,
  normalizeClueCapitalization,
  requiresCapitalizationInClue,
  verifyClueCapitalizationRules,
  verifyProperCapitalizationInClue,
} from "./dictionary-proper-nouns";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalizeTokenIfRequired(token: string): string {
  const letters = token.replace(/[^a-zA-Z]/g, "");
  const lower = letters.toLowerCase();
  if (!requiresCapitalizationInClue(lower)) return token;
  const capped = canonicalCapitalForm(lower);
  return token.replace(/[a-zA-Z]+/, capped);
}

/** Apply name/eponym/place capitals to each fodder token for the clue surface. */
export function formatFodderForClue(fodder: string): string {
  return fodder
    .trim()
    .split(/\s+/)
    .map((token) => capitalizeTokenIfRequired(token))
    .join(" ");
}

/** Replace a case-insensitive fodder phrase in the clue with properly capitalised form. */
export function applyFodderCasingInClue(
  clue: string,
  canonicalFodder: string
): string {
  const body = clue.replace(/\(\d+(?:,\s*\d+)*\)\s*$/, "");
  const suffix = clue.slice(body.length);
  let updated = body;

  for (const token of fodderTokens(canonicalFodder)) {
    const display = capitalizeTokenIfRequired(token);
    if (display.toLowerCase() === token) continue;
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, "gi");
    updated = updated.replace(re, display);
  }

  return updated + suffix;
}

/** Capitalise names and places anywhere in the clue body (dictionary + curated list). */
export function applyPlaceCasingInClue(clue: string): string {
  return applyDictionaryProperNounCasing(clue);
}

export function shouldCapitalizeFodderWord(word: string): boolean {
  return requiresCapitalizationInClue(word);
}

export function shouldCapitalizePlaceWord(word: string): boolean {
  return requiresCapitalizationInClue(word);
}
