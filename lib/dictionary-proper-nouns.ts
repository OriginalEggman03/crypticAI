import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { FAMOUS_FODDER_PROPER_NAMES } from "./proper-noun-words";

let lowercaseHeadwords: Set<string> | null = null;
let capitalizedForms: Map<string, string> | null = null;
/** Direct lowercase `.dic` entries → affix flags, or `null` when the line has no `/flags`. */
let lowercaseEntryFlags: Map<string, string | null> | null = null;

/** Bare Hunspell lemmas that are abbreviations, not standard crossword lexicon. */
const BARE_DICTIONARY_ABBREVIATIONS = new Set([
  "aux",
  "blvd",
  "comm",
  "corp",
  "corr",
  "ext",
  "gov",
  "inc",
  "ltd",
  "misc",
  "sci",
  "tel",
  "thru",
]);

function dictionaryPath(): string {
  return join(process.cwd(), "node_modules", "dictionary-en-gb", "index.dic");
}

function isAbbreviationOnlyAffixFlags(flags: string): boolean {
  return /^[JL]+$/.test(flags);
}

function loadDictionaryProperNounData(): void {
  if (lowercaseHeadwords && capitalizedForms && lowercaseEntryFlags) return;

  lowercaseHeadwords = new Set();
  capitalizedForms = new Map();
  lowercaseEntryFlags = new Map();

  const dicPath = dictionaryPath();
  if (!existsSync(dicPath)) {
    throw new Error(
      "British English dictionary not found. Run npm install dictionary-en-gb."
    );
  }

  const lines = readFileSync(dicPath, "utf8").split(/\r?\n/);
  const expected = parseInt(lines[0] ?? "0", 10);

  for (let i = 1; i < lines.length && i <= expected; i++) {
    const line = lines[i]?.trim() ?? "";
    if (!line) continue;

    const slashMatch = line.match(/^([^/\s]+)\/([A-Za-z]+)$/);
    const surface = slashMatch?.[1] ?? (/^[A-Za-z]{3,}$/.test(line) ? line : null);
    if (!surface) continue;

    const letters = surface.replace(/[^a-zA-Z]/g, "");
    if (letters.length < 3) continue;

    const lower = letters.toLowerCase();
    if (/^[a-z]/.test(surface)) {
      lowercaseHeadwords.add(lower);
      lowercaseEntryFlags!.set(lower, slashMatch ? slashMatch[2] : null);
      continue;
    }

    if (/^[A-Z]/.test(surface)) {
      capitalizedForms.set(
        lower,
        letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase()
      );
    }
  }
}

export function hasLowercaseDictionaryHeadword(word: string): boolean {
  loadDictionaryProperNounData();
  return lowercaseHeadwords!.has(word.toLowerCase().replace(/[^a-z]/g, ""));
}

/**
 * True for ordinary lowercase dictionary lemmas suitable as crossword answers/fodder.
 * Excludes abbreviation-only stems (e.g. com/JL), bare abbreviations (comm), and
 * capital-only proper nouns.
 */
export function isStandardDictionaryHeadword(word: string): boolean {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower) return false;
  if (!hasLowercaseDictionaryHeadword(lower)) return false;

  loadDictionaryProperNounData();
  if (!lowercaseEntryFlags!.has(lower)) return true;

  const flags = lowercaseEntryFlags!.get(lower);
  if (flags && isAbbreviationOnlyAffixFlags(flags)) return false;
  if (flags === null && BARE_DICTIONARY_ABBREVIATIONS.has(lower)) return false;
  return true;
}

export function getCapitalizedDictionaryForm(word: string): string | null {
  loadDictionaryProperNounData();
  return capitalizedForms!.get(word.toLowerCase().replace(/[^a-z]/g, "")) ?? null;
}

export function requiresFamousCapitalization(word: string): boolean {
  return FAMOUS_FODDER_PROPER_NAMES.has(
    word.toLowerCase().replace(/[^a-z]/g, "")
  );
}

function lettersOnly(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

/** Possessive fodder without an apostrophe, e.g. "jonahs" from Jonah. */
export function possessiveNameStem(word: string): string | null {
  const lower = lettersOnly(word);
  if (lower.length < 4 || !lower.endsWith("s")) return null;

  const stem = lower.slice(0, -1);
  if (stem.length < 2) return null;

  if (requiresFamousCapitalization(stem)) return stem;

  const capitalForm = getCapitalizedDictionaryForm(stem);
  if (capitalForm && !hasLowercaseDictionaryHeadword(stem)) return stem;

  return null;
}

function requiresCapitalizationForToken(lower: string): boolean {
  if (requiresFamousCapitalization(lower)) return true;

  const capitalForm = getCapitalizedDictionaryForm(lower);
  if (capitalForm && !hasLowercaseDictionaryHeadword(lower)) return true;

  return possessiveNameStem(lower) !== null;
}

/** True when this token must appear capitalised in a clue surface. */
export function requiresCapitalizationInClue(word: string): boolean {
  const lower = lettersOnly(word);
  if (!lower) return false;

  return requiresCapitalizationForToken(lower);
}

export function canonicalCapitalForm(word: string): string {
  const lower = lettersOnly(word);
  const stem = possessiveNameStem(lower);
  if (stem && lower.endsWith("s") && lower !== stem) {
    return canonicalCapitalForm(stem) + "s";
  }
  return (
    getCapitalizedDictionaryForm(lower) ??
    lower.charAt(0).toUpperCase() + lower.slice(1)
  );
}

function stripEnumeration(clue: string): string {
  return clue.replace(/\(\d+(?:,\s*\d+)*\)\s*$/, "").trim();
}

function splitClueBodyAndSuffix(clue: string): { body: string; suffix: string } {
  const suffixMatch = clue.match(/\(\d+(?:,\s*\d+)*\)\s*$/);
  const suffix = suffixMatch?.[0] ?? "";
  return { body: clue.slice(0, clue.length - suffix.length), suffix };
}

/** True when a word opens the clue or follows . ! ? (ignoring whitespace). */
export function followsSentenceEndPunctuation(
  body: string,
  wordStartIndex: number
): boolean {
  if (wordStartIndex === 0) return true;

  let i = wordStartIndex - 1;
  while (i >= 0 && /\s/.test(body[i])) i--;
  if (i < 0) return false;

  const ch = body[i];
  return ch === "." || ch === "!" || ch === "?";
}

function expectedWordCapitalization(
  word: string,
  atSentenceStart: boolean
): string {
  const lower = word.toLowerCase();

  if (requiresCapitalizationInClue(lower)) {
    return canonicalCapitalForm(lower);
  }

  if (lower === "i") return "I";

  if (atSentenceStart) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  return lower;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Hard check: every name/place token in the clue must be capitalised. */
export function verifyProperCapitalizationInClue(clue: string): string | null {
  const body = stripEnumeration(clue);
  const tokens = body.match(/\b[a-zA-Z]+\b/g) ?? [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);

    if (!requiresCapitalizationInClue(lower)) continue;

    const proper = canonicalCapitalForm(lower);
    const lowercaseOnly = new RegExp(`\\b${escapeRegExp(lower)}\\b`);
    if (lowercaseOnly.test(body)) {
      return `"${lower}" must be capitalised as a name or place (e.g. "${proper}")`;
    }
  }

  return null;
}

/** Lowercase all words except sentence starts and required proper nouns. */
export function normalizeClueCapitalization(clue: string): string {
  const suffixMatch = clue.match(/\(\d+(?:,\s*\d+)*\)\s*$/);
  const suffix = suffixMatch?.[0] ?? "";
  const body = clue.slice(0, clue.length - suffix.length);

  let result = "";
  let lastIndex = 0;
  const wordRegex = /\b[a-zA-Z]+\b/g;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(body)) !== null) {
    result += body.slice(lastIndex, match.index);
    const word = match[0];
    const atSentenceStart = followsSentenceEndPunctuation(body, match.index);
    result += expectedWordCapitalization(word, atSentenceStart);
    lastIndex = match.index + word.length;
  }

  result += body.slice(lastIndex);
  return result + suffix;
}

/** Sentence starts and names/places capped; all other words lowercase. */
export function verifyClueCapitalizationRules(clue: string): string | null {
  const { body } = splitClueBodyAndSuffix(clue);

  for (const match of body.matchAll(/\b[a-zA-Z]+\b/g)) {
    const token = match[0];
    const lower = token.toLowerCase();
    const atSentenceStart = followsSentenceEndPunctuation(body, match.index!);
    const expected = expectedWordCapitalization(token, atSentenceStart);

    if (token !== expected) {
      if (requiresCapitalizationInClue(lower)) {
        return `"${token}" should be "${expected}" — names and places must be capitalised`;
      }
      if (lower === "i") {
        return 'Standalone "I" must be capitalised';
      }
      if (atSentenceStart) {
        return `"${token}" should be "${expected}" — capitalise the first word after . ! or ?`;
      }
      return `"${token}" should be "${lower}" — only sentence starts and names/places are capitalised`;
    }
  }

  return null;
}

/** Capitalise every name/place token in the clue body. */
export function applyDictionaryProperNounCasing(clue: string): string {
  const suffixMatch = clue.match(/\(\d+(?:,\s*\d+)*\)\s*$/);
  const suffix = suffixMatch?.[0] ?? "";
  const body = clue.slice(0, clue.length - suffix.length);

  const cappedBody = body.replace(/\b[a-zA-Z]+\b/g, (word) => {
    const lower = word.toLowerCase();
    if (!requiresCapitalizationInClue(lower)) return word;
    return canonicalCapitalForm(lower);
  });

  return cappedBody + suffix;
}

export function resetDictionaryProperNounCache(): void {
  lowercaseHeadwords = null;
  capitalizedForms = null;
  lowercaseEntryFlags = null;
}
