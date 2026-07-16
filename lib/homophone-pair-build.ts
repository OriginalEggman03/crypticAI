import { lookupDictionaryDefinition } from "./answer-context";
import {
  buildHomophoneGroupsFromCmu,
  shareHomophonePronunciation,
  type HomophoneGroupBuild,
} from "./homophone-phonetics";
import { getCachedFullDefinition } from "./homophone-meaning";
import {
  haveIdenticalSpelling,
  isDistinctHomophonePair,
} from "./homophone-variants";

export interface HomophonePairBuild {
  wordA: string;
  wordB: string;
  definitionA: string;
  definitionB: string;
  partOfSpeechA?: string;
  partOfSpeechB?: string;
  phoneticKey: string;
}

export interface HomophoneDefinitionLookup {
  definition: string;
  partOfSpeech?: string;
}

/** Alphabetical pair order for stable storage keys. */
export function canonicalHomophonePair(
  a: string,
  b: string
): [string, string] {
  return a.localeCompare(b) <= 0 ? [a, b] : [b, a];
}

export function homophonePairKey(a: string, b: string): string {
  const [wordA, wordB] = canonicalHomophonePair(a, b);
  return `${wordA}|${wordB}`;
}

/** All unordered word pairs from a phonetic group. */
export function pairCombinationsFromGroup(words: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      pairs.push([words[i], words[j]]);
    }
  }
  return pairs;
}

function isUsableDictionaryDefinition(
  lookup: HomophoneDefinitionLookup | null | undefined
): lookup is HomophoneDefinitionLookup {
  return Boolean(lookup?.definition?.trim());
}

async function cachedDefinitionLookup(
  word: string
): Promise<HomophoneDefinitionLookup | null> {
  const cached = getCachedFullDefinition(word);
  if (cached?.definition) return cached;
  return lookupDictionaryDefinition(word);
}

/** Expand phonetic groups into validated pairs with dictionary definitions for both words. */
export async function buildValidatedHomophonePairs(
  groups: HomophoneGroupBuild[],
  lookupDefinition: (
    word: string
  ) => Promise<HomophoneDefinitionLookup | null> = cachedDefinitionLookup
): Promise<HomophonePairBuild[]> {
  const definitionCache = new Map<string, HomophoneDefinitionLookup>();
  const seen = new Set<string>();
  const pairs: HomophonePairBuild[] = [];

  async function definitionFor(word: string): Promise<HomophoneDefinitionLookup | null> {
    const cached = definitionCache.get(word);
    if (cached) return cached;

    const lookup = await lookupDefinition(word);
    if (!isUsableDictionaryDefinition(lookup)) return null;

    definitionCache.set(word, lookup);
    return lookup;
  }

  for (const group of groups) {
    for (const [rawA, rawB] of pairCombinationsFromGroup(group.words)) {
      if (haveIdenticalSpelling(rawA, rawB)) continue;
      if (!isDistinctHomophonePair(rawA, rawB)) continue;
      if (!shareHomophonePronunciation(rawA, rawB)) continue;

      const [wordA, wordB] = canonicalHomophonePair(rawA, rawB);
      const key = homophonePairKey(wordA, wordB);
      if (seen.has(key)) continue;

      const [defA, defB] = await Promise.all([
        definitionFor(wordA),
        definitionFor(wordB),
      ]);
      if (!isUsableDictionaryDefinition(defA) || !isUsableDictionaryDefinition(defB)) {
        continue;
      }

      seen.add(key);
      pairs.push({
        wordA,
        wordB,
        definitionA: defA.definition,
        definitionB: defB.definition,
        partOfSpeechA: defA.partOfSpeech,
        partOfSpeechB: defB.partOfSpeech,
        phoneticKey: group.phoneticKey,
      });
    }
  }

  return pairs.sort((left, right) =>
    left.wordA === right.wordA
      ? left.wordB.localeCompare(right.wordB)
      : left.wordA.localeCompare(right.wordA)
  );
}

/** Build validated homophone pairs from CMUdict groups. */
export async function buildHomophonePairsFromCmu(): Promise<HomophonePairBuild[]> {
  return buildValidatedHomophonePairs(
    buildHomophoneGroupsFromCmu(),
    cachedDefinitionLookup
  );
}
