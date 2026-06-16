import {
  canonicalCapitalForm,
  requiresCapitalizationInClue,
} from "./dictionary-proper-nouns";
import type { ClueSurfaceExplanation } from "./types";

function lettersKey(word: string): string {
  return word.toLowerCase().replace(/'/g, "");
}

function addCasingHint(hints: Map<string, string>, word: string): void {
  const letters = word.replace(/'/g, "");
  if (!/^[A-Z]/.test(letters)) return;

  const key = lettersKey(letters);
  const display = canonicalCapitalForm(key);
  if (!hints.has(key)) hints.set(key, display);
}

function casingHintsFromText(text: string): Map<string, string> {
  const hints = new Map<string, string>();

  for (const quoted of text.matchAll(/"([^"]+)"/g)) {
    for (const word of quoted[1].match(/\b[a-zA-Z']+\b/g) ?? []) {
      addCasingHint(hints, word);
    }
  }

  for (const word of text.match(/\b[a-zA-Z']+\b/g) ?? []) {
    addCasingHint(hints, word);
  }

  return hints;
}

/** Pull name/place capitals from the explanation back onto the clue surface. */
export function applyExplanationCapitalizationToClue(
  clue: string,
  explanation: ClueSurfaceExplanation
): string {
  const suffixMatch = clue.match(/\(\d+(?:,\s*\d+)*\)\s*$/);
  const suffix = suffixMatch?.[0] ?? "";
  const body = clue.slice(0, clue.length - suffix.length);

  const hints = new Map<string, string>();
  for (const text of [
    explanation.wordplay,
    explanation.definition,
    explanation.walkthrough,
  ]) {
    if (!text) continue;
    for (const [key, display] of casingHintsFromText(text)) {
      if (!hints.has(key)) hints.set(key, display);
    }
  }

  if (hints.size === 0) return clue;

  const aligned = body.replace(/\b[a-zA-Z']+\b/g, (word) => {
    const key = lettersKey(word);
    const hint = hints.get(key);
    if (!hint) return word;
    if (word !== word.toLowerCase() && word !== word.toLowerCase().replace(/'/g, "")) {
      return word;
    }
    if (!requiresCapitalizationInClue(key)) return word;
    return hint;
  });

  return aligned + suffix;
}
