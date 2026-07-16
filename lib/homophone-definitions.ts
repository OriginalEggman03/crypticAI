import { lookupDictionaryDefinition } from "./answer-context";
import { answerWords } from "./answer-format";
import { getHomophoneSynonyms, getStoredHomophoneDefinition } from "./db/homophones";
import { getCuratedHomophoneHints } from "./homophone-synonyms";

function capitalizeHint(hint: string): string {
  const trimmed = hint.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function hintFromDefinition(definition: string, maxWords = 4): string {
  const cleaned = definition.replace(/\([^)]*\)/g, "").replace(/;/g, ",").trim();
  const withoutArticle = cleaned.replace(/^(?:a|an|the)\s+/i, "");
  const firstClause = withoutArticle.split(/[,;]/)[0]?.trim() ?? withoutArticle;
  const words = firstClause.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return capitalizeHint(firstClause);
  return capitalizeHint(words.slice(0, maxWords).join(" "));
}

function normalizeHintText(text: string): string {
  return text.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedWordLetters(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

function isUsableHint(hint: string, word: string): boolean {
  const normalizedHint = normalizeHintText(hint);
  const normalizedWord = normalizedWordLetters(word);
  if (!normalizedHint || normalizedHint.length < 2) return false;
  if (normalizedHint === normalizedWord) return false;
  if (new RegExp(`\\b${escapeRegex(normalizedWord)}\\b`, "i").test(normalizedHint)) {
    return false;
  }
  return true;
}

const INCOMPLETE_FRAGMENT_ENDINGS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "and",
  "or",
  "with",
  "by",
]);

const DESCRIPTIVE_RELATION_PATTERNS = [
  /\bancestor of\b/i,
  /\btype of\b/i,
  /\bkind of\b/i,
  /\bform of\b/i,
  /\bvariety of\b/i,
  /\bspecies of\b/i,
];

/** True when a hint ends mid-phrase on a function word (e.g. "Wild ancestor of the"). */
export function isIncompletePhraseFragment(hint: string): boolean {
  const words = hint.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return false;
  return INCOMPLETE_FRAGMENT_ENDINGS.has(words[words.length - 1].toLowerCase());
}

/**
 * True when the hint only co-occurs with the target word as a modifier in a
 * descriptive phrase (e.g. "wild" from "wild boar" is not a synonym for boar).
 */
export function isCooccurringModifierHint(
  hint: string,
  word: string,
  sourceText?: string
): boolean {
  if (!sourceText) return false;

  const hintWords = normalizeHintText(hint).split(/\s+/).filter(Boolean);
  const normalizedWord = normalizedWordLetters(word);
  const normalizedSource = normalizeHintText(sourceText);
  if (!normalizedWord || hintWords.length === 0) return false;

  if (hintWords.length === 1) {
    const hintWord = hintWords[0];
    const beforeTarget = new RegExp(
      `\\b${escapeRegex(hintWord)}\\s+${escapeRegex(normalizedWord)}\\b`,
      "i"
    );
    const afterTarget = new RegExp(
      `\\b${escapeRegex(normalizedWord)}\\s+${escapeRegex(hintWord)}\\b`,
      "i"
    );
    if (beforeTarget.test(normalizedSource) || afterTarget.test(normalizedSource)) {
      return true;
    }
  }

  return false;
}

function isDescriptiveRelationalHint(hint: string): boolean {
  return DESCRIPTIVE_RELATION_PATTERNS.some((pattern) => pattern.test(hint));
}

function scrubLeavesOnlyModifier(clause: string, word: string, scrubbed: string): boolean {
  const remaining = normalizeHintText(scrubbed).split(/\s+/).filter(Boolean);
  if (remaining.length !== 1) return false;
  return isCooccurringModifierHint(remaining[0], word, clause);
}

/**
 * A homophone hint must be substitutable for the target word — not merely
 * co-occur in its dictionary gloss as a modifier or relational description.
 */
export function isSubstitutableHomophoneHint(
  hint: string,
  word: string,
  sourceText?: string
): boolean {
  if (!isUsableHint(hint, word)) return false;
  if (isGenericPartOfSpeechHint(hint)) return false;
  if (isIncompletePhraseFragment(hint)) return false;
  if (isDescriptiveRelationalHint(hint)) return false;
  if (isCooccurringModifierHint(hint, word, sourceText)) return false;
  return true;
}

/** Generic part-of-speech placeholders must never surface in clues. */
export function isGenericPartOfSpeechHint(hint: string): boolean {
  return /^a common (noun|verb|adjective|adverb)\b/i.test(hint.trim());
}

function scrubWordFromClause(clause: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return clause
    .replace(new RegExp(`\\b${escaped}\\b`, "gi"), "")
    .replace(/\s+/g, " ")
    .replace(/^(?:a|an|the)\s+/i, "")
    .trim();
}

/** Extract short hint phrases from a definition, trying every clause and scrubbing the target word. */
export function hintsFromDefinition(
  definition: string,
  word: string
): string[] {
  const cleaned = definition.replace(/\([^)]*\)/g, "").replace(/;/g, ",").trim();
  const clauses = cleaned
    .split(/[,;]/)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const hints: string[] = [];
  const seen = new Set<string>();

  function addHint(candidate: string, sourceText: string): void {
    const hint = capitalizeHint(candidate);
    const key = hint.toLowerCase();
    if (!isSubstitutableHomophoneHint(hint, word, sourceText) || seen.has(key)) {
      return;
    }
    seen.add(key);
    hints.push(hint);
  }

  for (const clause of clauses) {
    for (const maxWords of [4, 6]) {
      addHint(hintFromDefinition(clause, maxWords), clause);
      const scrubbed = scrubWordFromClause(clause, word);
      if (scrubbed && !scrubLeavesOnlyModifier(clause, word, scrubbed)) {
        addHint(hintFromDefinition(scrubbed, maxWords), clause);
      }
    }
  }

  return hints;
}

/** Curated-first, DB/dictionary-fallback hint phrases for homophone clue surfaces. */
export async function homophoneHintPhrases(word: string): Promise<string[]> {
  const lookupWord = answerWords(word)[0] ?? word;
  const storedDefinition = getStoredHomophoneDefinition(lookupWord)?.definition;
  const storedSynonyms = getHomophoneSynonyms(lookupWord)
    .filter((hint) => isSubstitutableHomophoneHint(hint, lookupWord, storedDefinition));
  if (storedSynonyms.length > 0) {
    return storedSynonyms;
  }

  const curated = getCuratedHomophoneHints(lookupWord);
  const phrases: string[] = [...curated];
  const seen = new Set(phrases.map((p) => p.toLowerCase()));

  if (phrases.length < 4) {
    const stored = getStoredHomophoneDefinition(lookupWord);
    const dict =
      stored ?? (await lookupDictionaryDefinition(lookupWord));
    if (dict?.definition) {
      for (const hint of hintsFromDefinition(dict.definition, lookupWord)) {
        if (seen.has(hint.toLowerCase())) continue;
        phrases.push(hint);
        seen.add(hint.toLowerCase());
      }
    }
  }

  return phrases.filter((hint) =>
    isSubstitutableHomophoneHint(hint, lookupWord, storedDefinition)
  );
}

/** True when a word has curated or dictionary-backed homophone hint phrases. */
export async function hasHomophoneHintPhrases(word: string): Promise<boolean> {
  const hints = await homophoneHintPhrases(word);
  return hints.length > 0;
}

/** @deprecated Use homophoneHintPhrases — kept for callers that only need answer-side hints. */
export async function homophoneDefinitionPhrases(
  answer: string
): Promise<string[]> {
  return homophoneHintPhrases(answer);
}
