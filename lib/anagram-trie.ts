import trieFactory from "trie-prefix-tree";
import { loadBritishWords } from "./word-list";

type TrieInstance = ReturnType<typeof trieFactory>;

let trie: TrieInstance | null = null;

function ensureTrie(): TrieInstance {
  if (!trie) {
    trie = trieFactory(loadBritishWords());
  }
  return trie;
}

/** Exact single-word anagrams using trie-prefix-tree. */
export function trieAnagrams(letters: string): string[] {
  const normalized = letters.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.length < 2) return [];

  try {
    return ensureTrie().getAnagrams(normalized) as string[];
  } catch {
    return [];
  }
}

/** Words formable from a subset of the letters. */
export function trieSubAnagrams(letters: string): string[] {
  const normalized = letters.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.length < 2) return [];

  try {
    return ensureTrie().getSubAnagrams(normalized) as string[];
  } catch {
    return [];
  }
}

export function trieHasWord(word: string): boolean {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!normalized) return false;
  return ensureTrie().hasWord(normalized) as boolean;
}
