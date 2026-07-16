import { dictionary } from "cmu-pronouncing-dictionary";
import {
  isStandardDictionaryHeadword,
  requiresCapitalizationInClue,
} from "./dictionary-proper-nouns";
import { isBannedNameFodderToken } from "./fodder-names";
import { areSpellingVariants, filterHomophoneGroupWords } from "./homophone-variants";

const MIN_WORD_LEN = 2;
const MAX_WORD_LEN = 15;
const WORD_PATTERN = /^[a-z]+$/;

export interface HomophoneGroupBuild {
  phoneticKey: string;
  words: string[];
}

function dedupeIdenticalSpellings(words: string[]): string[] {
  const sorted = [...words].sort((a, b) => a.localeCompare(b));
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const word of sorted) {
    const key = normalizeHomophoneWord(word);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(word);
  }

  return kept;
}

function filterSpellingVariantsOnly(words: string[]): string[] {
  const sorted = [...words].sort((a, b) => a.localeCompare(b));
  const kept: string[] = [];
  for (const word of sorted) {
    if (kept.some((rep) => areSpellingVariants(rep, word))) continue;
    kept.push(word);
  }
  return kept;
}

/** True when the CMUdict key is an alternate pronunciation (e.g. word(2)). */
function isAlternateCmuEntry(raw: string): boolean {
  return /\(\d+\)$/.test(raw);
}

function buildHomophoneGroupsWithWordFilter(
  filterWords: (words: string[]) => string[]
): HomophoneGroupBuild[] {
  const byKey = new Map<string, Set<string>>();

  for (const [raw, phones] of Object.entries(dictionary)) {
    // Alternate pronunciations (bally(2) = B EY L IY vs primary bally = B AE L IY)
    // must not create false homophone groups with words sharing only the alt key.
    if (isAlternateCmuEntry(raw)) continue;

    const word = normalizeHomophoneWord(raw);
    if (!word || !isValidHomophoneLexiconWord(word)) continue;

    const key = normalizePhonemeKey(phones);
    if (!key) continue;

    const set = byKey.get(key) ?? new Set<string>();
    set.add(word);
    byKey.set(key, set);
  }

  applyBritishHomophoneOverrides(byKey);

  return [...byKey.entries()]
    .map(([phoneticKey, words]) => ({
      phoneticKey,
      words: dedupeIdenticalSpellings(
        filterWords([...words]).filter((w) => isValidHomophoneLexiconWord(w))
      ),
    }))
    .filter(({ words }) => words.length >= 2)
    .map(({ phoneticKey, words }) => ({
      phoneticKey,
      words: words.sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.words[0].localeCompare(b.words[0]));
}

/** Build homophone groups from CMUdict — words sharing the same normalized pronunciation. */
export function buildHomophoneGroupsFromCmu(): HomophoneGroupBuild[] {
  return buildHomophoneGroupsWithWordFilter(filterHomophoneGroupWords);
}

/** Groups after spelling-variant dedupe only (for before/after audits). */
export function buildHomophoneGroupsSpellingOnly(): HomophoneGroupBuild[] {
  return buildHomophoneGroupsWithWordFilter(filterSpellingVariantsOnly);
}

/** British dictionary word suitable for homophone answer/fodder (no places or surnames). */
export function isValidHomophoneLexiconWord(raw: string): boolean {
  const word = normalizeHomophoneWord(raw);
  if (!word) return false;
  if (!isStandardDictionaryHeadword(word)) return false;
  if (requiresCapitalizationInClue(word)) return false;
  if (isBannedNameFodderToken(word)) return false;
  return true;
}

/** Strip lexical stress digits for homophone grouping. TH/DH stay distinct from T/D. */
export function normalizePhonemeKey(phones: string): string {
  return phones
    .replace(/\d/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * British RP homophone sets where CMUdict uses different phonemes (e.g. TH vs T).
 * Applied after CMU grouping — only verified pairs, never a global phoneme merge.
 */
export const BRITISH_HOMOPHONE_OVERRIDE_GROUPS: readonly string[][] = [
  ["thyme", "time"],
];

/** True when two words are in an explicit British homophone override set. */
export function areBritishHomophoneOverridePair(a: string, b: string): boolean {
  const wa = normalizeHomophoneWord(a);
  const wb = normalizeHomophoneWord(b);
  if (!wa || !wb) return false;
  return BRITISH_HOMOPHONE_OVERRIDE_GROUPS.some(
    (group) => group.includes(wa) && group.includes(wb)
  );
}

/** True when two words share pronunciation for homophone pairing purposes. */
export function shareHomophonePronunciation(a: string, b: string): boolean {
  return (
    sharePrimaryPronunciation(a, b) || areBritishHomophoneOverridePair(a, b)
  );
}

function applyBritishHomophoneOverrides(
  groupMap: Map<string, Set<string>>
): void {
  for (const overrideWords of BRITISH_HOMOPHONE_OVERRIDE_GROUPS) {
    const validOverrides = overrideWords.filter(
      (w) => isValidHomophoneLexiconWord(w) && lookupCmuPronunciation(w)
    );
    if (validOverrides.length < 2) continue;

    const overrideSet = new Set(validOverrides);
    const keysToMerge: string[] = [];
    const mergedWords = new Set<string>(validOverrides);

    for (const [key, words] of groupMap) {
      if ([...words].some((w) => overrideSet.has(w))) {
        keysToMerge.push(key);
        for (const w of words) mergedWords.add(w);
      }
    }

    for (const key of keysToMerge) {
      groupMap.delete(key);
    }

    const filtered = filterHomophoneGroupWords([...mergedWords]);
    if (filtered.length < 2) continue;

    const phoneticKey =
      keysToMerge.length > 0
        ? keysToMerge.sort().join("|")
        : `british:${validOverrides.sort().join(",")}`;

    groupMap.set(phoneticKey, new Set(filtered));
  }
}

export function normalizeHomophoneWord(raw: string): string | null {
  const word = raw.replace(/\(\d+\)$/, "").toLowerCase().replace(/[^a-z]/g, "");
  if (!word || !WORD_PATTERN.test(word)) return null;
  if (word.length < MIN_WORD_LEN || word.length > MAX_WORD_LEN) return null;
  return word;
}

/** Primary CMUdict pronunciation only (no alternate (2)/(3) entries). */
export function lookupCmuPronunciation(word: string): string | undefined {
  const normalized = word.toLowerCase().trim();
  return dictionary[normalized];
}

/** Normalized phoneme key for a word's primary CMUdict pronunciation. */
export function primaryPhonemeKey(word: string): string | null {
  const phones = lookupCmuPronunciation(word);
  if (!phones) return null;
  return normalizePhonemeKey(phones);
}

/** True when two words share the same primary CMUdict pronunciation. */
export function sharePrimaryPronunciation(a: string, b: string): boolean {
  const keyA = primaryPhonemeKey(a);
  const keyB = primaryPhonemeKey(b);
  return Boolean(keyA && keyB && keyA === keyB);
}
