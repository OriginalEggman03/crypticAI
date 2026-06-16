import { isDictionaryWord } from "./inspiration-parse";
import {
  canonicalCapitalForm,
  requiresCapitalizationInClue,
} from "./dictionary-proper-nouns";

function fodderTokens(fodder: string): string[] {
  return fodder
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z]/g, ""))
    .filter(Boolean);
}

function tokenHasProperCapitalization(token: string, canonicalLower: string): boolean {
  const letters = token.replace(/[^a-zA-Z]/g, "");
  if (!letters) return false;
  return (
    letters.toLowerCase() === canonicalLower &&
    letters === canonicalCapitalForm(canonicalLower)
  );
}

/**
 * Personal/family names in the dictionary that are not fair fodder even when capitalised
 * (too obscure for solvers to read naturally on the clue surface).
 */
const BANNED_NAME_FODDER = new Set([
  "agnew",
  "spiro",
  "quayle",
  "fillmore",
  "pierce",
  "buchanan",
  "polk",
  "taft",
  "coolidge",
  "mckinley",
  "hayes",
  "brandt",
  "schmidt",
  "mueller",
  "schulz",
  "kramer",
  "snyder",
  "becker",
  "fischer",
  "meyer",
  "cagney",
  "bogart",
  "garbo",
  "loren",
  "gable",
  "astaire",
  "fowler",
  "sawyer",
  "barker",
  "tucker",
  "garner",
  "turner",
  "presley",
  "garfunkel",
  "crosby",
  "hitchcock",
  "kubrick",
  "coppola",
  "scorsese",
  "tarantino",
  "paramount",
]);

/** True when a dictionary word is an obscure personal name — never fair as fodder. */
export function isBannedNameFodderToken(token: string): boolean {
  const lower = token.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower || !isDictionaryWord(lower)) return false;
  return BANNED_NAME_FODDER.has(lower);
}

/** Reject banned names; require capitalised names/places in fodder and clue. */
export function fodderProperNameIssue(
  canonicalFodder: string,
  displayFodder?: string,
  clue?: string
): string | null {
  const tokens = fodderTokens(canonicalFodder);
  if (tokens.length === 0) return null;

  for (const token of tokens) {
    if (isBannedNameFodderToken(token)) {
      return `Fodder word "${token}" is an obscure proper name — use ordinary dictionary words instead (only famous names or places like Oort, John, Paris, Poole are allowed, capitalised)`;
    }
  }

  if (displayFodder !== undefined) {
    const displayParts = displayFodder.trim().split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const displayToken = displayParts[i] ?? token;

      if (requiresCapitalizationInClue(token)) {
        if (!tokenHasProperCapitalization(displayToken, token)) {
          return `Name or place "${token}" in fodder must be capitalised in the clue (e.g. "${canonicalCapitalForm(token)}")`;
        }
      }
    }
  }

  if (clue) {
    for (const token of tokens) {
      if (!requiresCapitalizationInClue(token)) continue;
      const lowerRe = new RegExp(`\\b${token}\\b`);
      if (lowerRe.test(clue.replace(/\(\d+(?:,\s*\d+)*\)\s*$/, ""))) {
        return `Name or place "${token}" must be capitalised in the clue (e.g. "${canonicalCapitalForm(token)}")`;
      }
    }
  }

  return null;
}

/** Pair search: reject obscure personal names (capitalisation checked later on the clue). */
export function hasBannedNameFodder(fodder: string): boolean {
  return fodderTokens(fodder).some(isBannedNameFodderToken);
}
