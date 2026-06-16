import { loadBritishWords } from "./word-list";
import { trieHasWord } from "./anagram-trie";

type LetterCounts = Map<string, number>;

export interface PhraseAnagramOptions {
  limit?: number;
  minWordLen?: number;
  /** When true, only return phrases with 2+ words. */
  multiWordOnly?: boolean;
}

function toCounts(text: string): LetterCounts {
  const counts = new Map<string, number>();
  for (const ch of text.toLowerCase().replace(/[^a-z]/g, "")) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  return counts;
}

function countTotal(counts: LetterCounts): number {
  let total = 0;
  for (const n of counts.values()) total += n;
  return total;
}

function subtractWord(
  remaining: LetterCounts,
  word: string
): LetterCounts | null {
  const next = new Map(remaining);
  for (const ch of word) {
    const n = (next.get(ch) ?? 0) - 1;
    if (n < 0) return null;
    if (n === 0) next.delete(ch);
    else next.set(ch, n);
  }
  return next;
}

function countsEmpty(counts: LetterCounts): boolean {
  return counts.size === 0;
}

let wordsLongestFirst: string[] | null = null;

function candidateWords(answerLen: number, minWordLen: number): string[] {
  if (!wordsLongestFirst) {
    wordsLongestFirst = [...loadBritishWords()].sort(
      (a, b) => b.length - a.length
    );
  }
  return wordsLongestFirst.filter(
    (w) => w.length >= minWordLen && w.length <= answerLen
  );
}

/**
 * Swappy-style depth-first search: find word sequences that use all letters of
 * `answer` exactly once (multi-word phrase anagrams).
 */
export function findPhraseAnagrams(
  answer: string,
  opts: PhraseAnagramOptions = {}
): string[] {
  const limit = opts.limit ?? 24;
  const minWordLen = opts.minWordLen ?? 3;
  const multiWordOnly = opts.multiWordOnly ?? true;

  const answerLetters = answer.toLowerCase().replace(/[^a-z]/g, "");
  if (answerLetters.length < 4) return [];

  const remaining = toCounts(answerLetters);
  const words = candidateWords(answerLetters.length, minWordLen);
  const results: string[] = [];
  const seen = new Set<string>();

  function dfs(left: LetterCounts, picked: string[]) {
    if (results.length >= limit) return;

    if (countsEmpty(left)) {
      const phrase = picked.join(" ");
      if (multiWordOnly && picked.length < 2) return;
      if (seen.has(phrase)) return;
      seen.add(phrase);
      results.push(phrase);
      return;
    }

    const leftLen = countTotal(left);

    for (const word of words) {
      if (word.length > leftLen) continue;
      if (!trieHasWord(word)) continue;

      const next = subtractWord(left, word);
      if (!next) continue;

      dfs(next, [...picked, word]);
      if (results.length >= limit) return;
    }
  }

  dfs(remaining, []);
  return results;
}
