import {
  answerLetterCount,
  fodderDuplicatesAnswer,
  normalizeAnswer,
} from "./answer-format";
import {
  answerLengthInBounds,
  dictionaryScanMaxLength,
  type AnswerLengthBounds,
} from "./anagram-difficulty";
import { defaultMaxAnswersToProcess, type AnagramPair } from "./anagram-dictionary";
import { isGrammaticalDictionaryFodder } from "./fodder-quality";
import { getHomophonePartners, listHomophoneLexiconWords } from "./db/homophones";
import { isValidHomophoneLexiconWord } from "./homophone-phonetics";
import { isDistinctHomophonePair } from "./homophone-variants";
import { sampleWithSeed, shuffleWithSeed } from "./anagram-indicators";
import { loadBritishWords, wordsByLength } from "./word-list";

export type HomophonePair = AnagramPair;

export interface HomophonePairSearchOptions {
  excludeAnswers?: string[];
  dictionaryScanLimit?: number;
  maxAnswersToProcess?: number;
  /** Varies pair order between generate/retry attempts. */
  shuffleSeed?: string;
}

function pairKey(answer: string, fodder: string): string {
  return `${answer.toUpperCase()}|${fodder.toLowerCase()}`;
}

function pairQualityScore(answer: string, fodder: string): number {
  let score = isGrammaticalDictionaryFodder(fodder) ? 10 : -20;
  score += Math.min(answerLetterCount(answer), 8);
  return score;
}

function formatAnswer(answer: string): string {
  return normalizeAnswer(answer);
}

export function findHomophoneFoddersForAnswer(answer: string): string[] {
  const answerWord = answer.toLowerCase().replace(/[^a-z]/g, "");
  if (!answerWord) return [];

  return getHomophonePartners(answerWord).filter(
    (partner) =>
      partner !== answerWord &&
      isDistinctHomophonePair(answerWord, partner) &&
      isValidHomophoneLexiconWord(partner) &&
      isGrammaticalDictionaryFodder(partner)
  );
}

const MAX_FODDERS_PER_ANSWER = 4;

function collectHomophoneAnswerCandidates(
  bounds: AnswerLengthBounds,
  options: Pick<
    HomophonePairSearchOptions,
    "excludeAnswers" | "dictionaryScanLimit" | "shuffleSeed"
  > = {}
): string[] {
  const excludeSet = options.excludeAnswers?.length
    ? new Set(options.excludeAnswers.map((a) => normalizeAnswer(a)))
    : undefined;
  const byLen = wordsByLength(loadBritishWords());
  const scanMax = dictionaryScanMaxLength(bounds, byLen.keys());
  const scanLimit = options.dictionaryScanLimit ?? 160;
  const eligible: string[] = [];
  const seen = new Set<string>();

  const dictionaryWords = listHomophoneLexiconWords(
    bounds.minLength,
    scanMax
  );

  for (const word of dictionaryWords) {
    const answer = normalizeAnswer(word);
    if (!answer || !answerLengthInBounds(answerLetterCount(answer), bounds)) {
      continue;
    }
    if (excludeSet?.has(answer)) continue;
    if (seen.has(answer)) continue;
    if (!isValidHomophoneLexiconWord(answer)) continue;
    if (findHomophoneFoddersForAnswer(answer).length === 0) continue;

    seen.add(answer);
    eligible.push(answer);
  }

  if (!options.shuffleSeed) return eligible.slice(0, scanLimit);

  return sampleWithSeed(
    eligible,
    scanLimit,
    `${options.shuffleSeed}-answers`
  );
}

export function pairsForAnswer(
  answer: string,
  shuffleSeed?: string
): HomophonePair[] {
  const answerDisplay = formatAnswer(answer);
  const out: HomophonePair[] = [];
  const seenFodder = new Set<string>();

  for (const fodder of findHomophoneFoddersForAnswer(answerDisplay)) {
    if (out.length >= MAX_FODDERS_PER_ANSWER) break;
    if (fodderDuplicatesAnswer(fodder, answerDisplay)) continue;
    if (seenFodder.has(fodder)) continue;

    seenFodder.add(fodder);
    out.push({
      answer: answerDisplay,
      fodder,
      themeScore: pairQualityScore(answerDisplay, fodder),
      isPhrase: false,
      isMultiWordAnswer: answerDisplay.includes(" "),
    });
  }

  const sorted = out.sort((a, b) => b.themeScore - a.themeScore);
  return shuffleSeed
    ? shuffleWithSeed(sorted, `${shuffleSeed}-fodders-${answerDisplay}`)
    : sorted;
}

export function listCandidateHomophonePairs(
  bounds: AnswerLengthBounds,
  limit = 16,
  options: HomophonePairSearchOptions = {}
): HomophonePair[] {
  const answers = collectHomophoneAnswerCandidates(bounds, {
    excludeAnswers: options.excludeAnswers,
    dictionaryScanLimit: options.dictionaryScanLimit,
    shuffleSeed: options.shuffleSeed,
  });

  const excludeSet = options.excludeAnswers?.length
    ? new Set(options.excludeAnswers.map((a) => normalizeAnswer(a)))
    : undefined;

  const maxAnswersToProcess =
    options.maxAnswersToProcess ??
    defaultMaxAnswersToProcess(bounds, excludeSet?.size ?? 0);

  const pairs: HomophonePair[] = [];
  const seenKeys = new Set<string>();
  let answersProcessed = 0;

  for (const answer of answers) {
    if (excludeSet?.has(normalizeAnswer(answer))) continue;
    answersProcessed += 1;
    if (answersProcessed > maxAnswersToProcess) break;

    for (const pair of pairsForAnswer(answer, options.shuffleSeed)) {
      const key = pairKey(pair.answer, pair.fodder);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      pairs.push(pair);
    }

    if (!excludeSet && pairs.length >= limit * 2) break;
    if (excludeSet && pairs.length >= limit) break;
  }

  const ordered = shuffleWithSeed(pairs, options.shuffleSeed ?? "homophone");
  return ordered.slice(0, limit);
}

export function findAnyHomophonePair(bounds: AnswerLengthBounds): HomophonePair | null {
  const byLen = wordsByLength(loadBritishWords());
  const scanMax = dictionaryScanMaxLength(bounds, byLen.keys());

  for (let len = bounds.minLength; len <= scanMax; len++) {
    for (const answer of [...(byLen.get(len) ?? [])].sort()) {
      const pairs = pairsForAnswer(answer);
      if (pairs.length > 0) return pairs[0];
    }
  }

  return null;
}
