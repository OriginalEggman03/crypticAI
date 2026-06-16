import {
  answerLetters,
  fodderDuplicatesAnswer,
  fodderExposesAnswerWord,
  normalizeAnswer,
} from "./answer-format";
import {
  answerLengthInBounds,
  dictionaryScanMaxLength,
  type AnswerLengthBounds,
} from "./anagram-difficulty";
import {
  isGrammaticalDictionaryFodder,
  rankFodderCandidates,
  scoreFodderGrammaticality,
} from "./fodder-quality";
import { filterNontrivialFodders, isTrivialWordReorderFodder } from "./anagram-mix";
import { isAnagramOf } from "./clue-verify";
import {
  isValidThemedAnswer,
  normalizeSuggestedAnswers,
  parseInspiration,
  type ParsedInspiration,
} from "./inspiration-parse";
import { findPhraseAnagrams } from "./phrase-anagram";
import { scoreAnswerRelevance, scoreFodderRelevance } from "./theme-scoring";
import {
  isWeakThematicAnswer,
  meetsThematicBar,
} from "./theme-link-quality";
import { trieAnagrams } from "./anagram-trie";
import { loadBritishWords, wordsByLength } from "./word-list";

export interface AnagramPair {
  answer: string;
  fodder: string;
  themeScore: number;
  /** True when fodder is multiple words (phrase anagram). */
  isPhrase?: boolean;
  /** True when the answer itself is a multi-word phrase. */
  isMultiWordAnswer?: boolean;
}

export interface PairSearchOptions {
  suggestedAnswers?: string[];
  /** Answers to skip — used on retry so search digs deeper. */
  excludeAnswers?: string[];
  dictionaryScanLimit?: number;
  minThemeScore?: number;
  /** Skip the heavy full-dictionary scan (use Claude suggestions only). */
  skipDictionaryScan?: boolean;
  maxAnswersToProcess?: number;
}

function pairKey(answer: string, fodder: string): string {
  return `${answer.toUpperCase()}|${fodder.toLowerCase()}`;
}

function pairThemeScore(
  answer: string,
  fodder: string,
  parsed: ParsedInspiration,
  isPhrase: boolean,
  suggested?: Set<string>
): number {
  const answerScore = scoreAnswerRelevance(answer, parsed, suggested);
  const fodderScore = scoreFodderRelevance(fodder, parsed);
  const grammarScore = scoreFodderGrammaticality(fodder);
  const phraseBonus = isPhrase ? 10 : 0;
  return answerScore + fodderScore + grammarScore + phraseBonus;
}

function formatAnswer(answer: string): string {
  return normalizeAnswer(answer);
}

function pushPair(
  pairs: AnagramPair[],
  seen: Set<string>,
  answer: string,
  fodder: string,
  parsed: ParsedInspiration,
  isPhrase: boolean,
  suggested?: Set<string>
): void {
  if (fodderDuplicatesAnswer(fodder, answer)) return;

  const key = pairKey(answer, fodder);
  if (seen.has(key)) return;

  const themeScore = pairThemeScore(
    answer,
    fodder,
    parsed,
    isPhrase,
    suggested
  );
  if (themeScore < -50) return;

  seen.add(key);
  pairs.push({
    answer: formatAnswer(answer),
    fodder: fodder.toLowerCase(),
    themeScore,
    isPhrase,
    isMultiWordAnswer: formatAnswer(answer).includes(" "),
  });
}

/** Single-word fodder candidates for an answer (trie-prefix-tree). */
export function findFodderCandidates(answer: string): string[] {
  const normalizedAnswer = answer.toLowerCase().replace(/[^a-z]/g, "");
  const raw = trieAnagrams(normalizedAnswer).filter(
    (w) => w !== normalizedAnswer && isAnagramOf(w, normalizedAnswer)
  );
  return rankFodderCandidates(filterNontrivialFodders(normalizedAnswer, raw));
}

/** Multi-word phrase fodder candidates (Swappy-style DFS). */
export function findPhraseFodderCandidates(
  answer: string,
  limit = 24
): string[] {
  const raw = findPhraseAnagrams(answer, {
    limit: limit * 3,
    minWordLen: 3,
    multiWordOnly: true,
  });
  return rankFodderCandidates(
    filterNontrivialFodders(answer, raw)
  ).slice(0, limit);
}

export function findAllFoddersForAnswer(
  answer: string,
  phraseLimit = 16
): string[] {
  return [
    ...findFodderCandidates(answer),
    ...findPhraseFodderCandidates(answer, phraseLimit),
  ];
}

const MAX_FODDERS_PER_ANSWER = 4;

function considerFodder(
  out: AnagramPair[],
  seenFodder: Set<string>,
  answerDisplay: string,
  letterPool: string,
  fodder: string,
  parsed: ParsedInspiration,
  isPhrase: boolean,
  suggested?: Set<string>
): void {
  if (out.length >= MAX_FODDERS_PER_ANSWER) return;
  if (fodderDuplicatesAnswer(fodder, answerDisplay)) return;
  if (fodderExposesAnswerWord(fodder, answerDisplay)) return;
  if (!isAnagramOf(fodder, letterPool)) return;
  if (isTrivialWordReorderFodder(fodder, answerDisplay)) return;
  if (!isGrammaticalDictionaryFodder(fodder)) return;

  const fodderKey = fodder.toLowerCase();
  if (seenFodder.has(fodderKey)) return;

  const score = pairThemeScore(
    answerDisplay,
    fodder,
    parsed,
    isPhrase,
    suggested
  );
  if (score < -50) return;
  if (isWeakThematicAnswer(answerDisplay, parsed)) return;

  seenFodder.add(fodderKey);
  out.push({
    answer: answerDisplay,
    fodder: fodderKey,
    themeScore: score,
    isPhrase,
    isMultiWordAnswer: answerDisplay.includes(" "),
  });
}

export function pairsForAnswer(
  answer: string,
  parsed: ParsedInspiration,
  suggested?: Set<string>
): AnagramPair[] {
  const answerDisplay = formatAnswer(answer);
  const letterPool = answerLetters(answerDisplay);
  if (!letterPool) return [];

  const out: AnagramPair[] = [];
  const seenFodder = new Set<string>();

  for (const fodder of findFodderCandidates(letterPool)) {
    considerFodder(
      out,
      seenFodder,
      answerDisplay,
      letterPool,
      fodder,
      parsed,
      false,
      suggested
    );
  }

  for (const phrase of findPhraseFodderCandidates(letterPool, 24)) {
    considerFodder(
      out,
      seenFodder,
      answerDisplay,
      letterPool,
      phrase,
      parsed,
      true,
      suggested
    );
  }

  return out;
}

/** Best single pair for one answer — one fodder choice only. */
export function bestPairForAnswer(
  answer: string,
  parsed: ParsedInspiration,
  suggested?: Set<string>
): AnagramPair | null {
  const pairs = pairsForAnswer(answer, parsed, suggested);
  if (pairs.length === 0) return null;
  return pairs.reduce((best, p) =>
    p.themeScore > best.themeScore ? p : best
  );
}

function collectAnswerCandidates(
  parsed: ParsedInspiration,
  bounds: AnswerLengthBounds,
  suggestedSet?: Set<string>,
  options: Pick<
    PairSearchOptions,
    | "excludeAnswers"
    | "dictionaryScanLimit"
    | "minThemeScore"
    | "skipDictionaryScan"
  > = {}
): string[] {
  const { minLength, maxLength } = bounds;
  const excludeSet = options.excludeAnswers?.length
    ? new Set(options.excludeAnswers.map((a) => normalizeAnswer(a)))
    : undefined;
  const dictionaryScanLimit = options.dictionaryScanLimit ?? 80;
  const minThemeScore = options.minThemeScore ?? 350;
  const skipDictionaryScan = options.skipDictionaryScan ?? false;
  const ordered: string[] = [];
  const seen = new Set<string>();

  const isExcluded = (word: string) =>
    excludeSet?.has(normalizeAnswer(word)) ?? false;

  const addThemed = (word: string) => {
    const w = normalizeAnswer(word);
    if (isExcluded(w)) return;
    const letters = answerLetters(w);
    if (!answerLengthInBounds(letters.length, bounds)) return;
    if (seen.has(w)) return;
    if (!isValidThemedAnswer(w, parsed, { fromTheme: true, bounds })) return;
    if (isWeakThematicAnswer(w, parsed)) return;
    seen.add(w);
    ordered.push(w);
  };

  if (suggestedSet) {
    for (const w of suggestedSet) addThemed(w);
  }

  const dictionaryCandidates: string[] = [];
  if (!skipDictionaryScan) {
    const byLen = wordsByLength(loadBritishWords());
    const scanMax = dictionaryScanMaxLength(bounds, byLen.keys());
    const scored: { word: string; score: number }[] = [];

    for (let len = minLength; len <= scanMax; len++) {
      for (const word of byLen.get(len) ?? []) {
        const score = scoreAnswerRelevance(word, parsed, suggestedSet);
        if (
          meetsThematicBar(
            word.toUpperCase(),
            parsed,
            score,
            suggestedSet,
            minThemeScore
          )
        ) {
          scored.push({ word: word.toUpperCase(), score });
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);
    for (const { word } of scored.slice(0, dictionaryScanLimit)) {
      const w = normalizeAnswer(word);
      if (isExcluded(w)) continue;
      const letters = answerLetters(w);
      if (!answerLengthInBounds(letters.length, bounds)) continue;
      if (seen.has(w)) continue;
      if (!isValidThemedAnswer(w, parsed, { fromTheme: false, bounds })) continue;
      dictionaryCandidates.push(w);
      seen.add(w);
    }
  }

  // Hard mode: themed dictionary words before parsed entity fragments so 8+ letter
  // answers are not starved when Claude suggestions fill the processing budget.
  if (bounds.minLength >= 8) {
    ordered.push(...dictionaryCandidates);
    for (const entity of parsed.entityCandidates) {
      addThemed(entity);
    }
  } else {
    for (const entity of parsed.entityCandidates) {
      addThemed(entity);
    }
    ordered.push(...dictionaryCandidates);
  }

  return ordered;
}

/** How many answer candidates to expand into pairs before stopping. */
export function defaultMaxAnswersToProcess(
  bounds: AnswerLengthBounds,
  excludeAnswerCount = 0
): number {
  const base = bounds.minLength >= 8 ? 56 : 36;
  if (excludeAnswerCount === 0) return base;
  return Math.min(96, base + excludeAnswerCount * 6);
}

/**
 * Candidate pairs: at most one pair per answer, ranked by theme relevance.
 * Avoids sending Claude many fodder variants of the same word.
 */
export function listCandidatePairs(
  inspiration: string,
  bounds: AnswerLengthBounds,
  limit = 16,
  options: PairSearchOptions = {}
): AnagramPair[] {
  const parsed = parseInspiration(inspiration);
  const suggestedSet = options.suggestedAnswers?.length
    ? new Set(
        normalizeSuggestedAnswers(
          options.suggestedAnswers,
          parsed,
          bounds.minLength,
          bounds.maxLength,
          bounds
        ).filter((w) => !isWeakThematicAnswer(w, parsed))
      )
    : undefined;

  const answers = collectAnswerCandidates(parsed, bounds, suggestedSet, {
    excludeAnswers: options.excludeAnswers,
    dictionaryScanLimit: options.dictionaryScanLimit,
    minThemeScore: options.minThemeScore,
    skipDictionaryScan: options.skipDictionaryScan,
  });

  const excludeSet = options.excludeAnswers?.length
    ? new Set(options.excludeAnswers.map((a) => normalizeAnswer(a)))
    : undefined;

  const maxAnswersToProcess =
    options.maxAnswersToProcess ??
    defaultMaxAnswersToProcess(bounds, excludeSet?.size ?? 0);
  const pairs: AnagramPair[] = [];
  const seenKeys = new Set<string>();
  let answersProcessed = 0;

  for (const answer of answers) {
    if (excludeSet?.has(normalizeAnswer(answer))) continue;
    answersProcessed += 1;
    if (answersProcessed > maxAnswersToProcess) break;

    for (const pair of pairsForAnswer(answer, parsed, suggestedSet)) {
      const key = pairKey(pair.answer, pair.fodder);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      pairs.push(pair);
    }
    if (!excludeSet && pairs.length >= limit * 2) break;
    if (excludeSet && pairs.length >= limit) break;
  }

  pairs.sort((a, b) => b.themeScore - a.themeScore);
  return pairs.slice(0, limit);
}

export function findThemedAnagramPairs(
  inspiration: string,
  bounds: AnswerLengthBounds,
  limit = 24
): AnagramPair[] {
  return listCandidatePairs(inspiration, bounds, limit);
}

export function findAnyAnagramPair(bounds: AnswerLengthBounds): AnagramPair | null {
  const byLen = wordsByLength(loadBritishWords());
  const scanMax = dictionaryScanMaxLength(bounds, byLen.keys());

  for (let len = bounds.minLength; len <= scanMax; len++) {
    for (const answer of [...(byLen.get(len) ?? [])].sort()) {
      const parsed = parseInspiration("");
      const pair = bestPairForAnswer(answer, parsed);
      if (pair) return pair;
    }
  }

  return null;
}

export function resolveVerifiedPair(
  inspiration: string,
  bounds: AnswerLengthBounds,
  preferredAnswer?: string
): AnagramPair | null {
  const parsed = parseInspiration(inspiration);

  if (preferredAnswer?.trim()) {
    const pair = bestPairForAnswer(normalizeAnswer(preferredAnswer), parsed);
    if (pair) return pair;
  }

  const pairs = listCandidatePairs(inspiration, bounds, 1);
  if (pairs.length > 0) return pairs[0];

  return findAnyAnagramPair(bounds);
}
