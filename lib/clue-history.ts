import { normalizeAnswer } from "./answer-format";
import type { AnagramClueDraft, UsedAnagramClue } from "./types";

export function toUsedClue(draft: AnagramClueDraft): UsedAnagramClue {
  return {
    answer: normalizeAnswer(draft.answer),
    anagramFodder: draft.anagramFodder.toLowerCase().trim(),
    clue: draft.clue.trim(),
    anagramIndicator: draft.anagramIndicator?.toLowerCase().trim(),
  };
}

export function normalizeUsedClue(raw: UsedAnagramClue): UsedAnagramClue {
  return {
    answer: normalizeAnswer(raw.answer),
    anagramFodder: raw.anagramFodder.toLowerCase().trim(),
    clue: raw.clue.trim(),
  };
}

/** Distinct answers already shown for this inspiration. */
export function usedAnswersFromClues(exclude: UsedAnagramClue[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of exclude) {
    const answer = normalizeUsedClue(raw).answer;
    if (seen.has(answer)) continue;
    seen.add(answer);
    out.push(answer);
  }
  return out;
}

/** Answer and fodder words already used in homophone clues (blocks flipped pairs on retry). */
export function usedHomophoneWordsFromClues(exclude: UsedAnagramClue[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of exclude) {
    const used = normalizeUsedClue(raw);
    for (const token of [used.answer, used.anagramFodder]) {
      const normalized = normalizeAnswer(token);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

/** Block reuse when fodder matches and answer or clue surface already appeared. */
export function isClueReuseBlocked(
  draft: AnagramClueDraft,
  exclude: UsedAnagramClue[]
): boolean {
  if (exclude.length === 0) return false;

  const answer = normalizeAnswer(draft.answer);
  const fodder = draft.anagramFodder.toLowerCase().trim();
  const clue = draft.clue.trim();

  return exclude.some((raw) => {
    const used = normalizeUsedClue(raw);
    if (used.anagramFodder !== fodder) return false;
    return used.answer === answer || used.clue === clue;
  });
}

export function isDuplicateClue(
  draft: AnagramClueDraft,
  exclude: UsedAnagramClue[]
): boolean {
  if (exclude.length === 0) return false;

  const answer = normalizeAnswer(draft.answer);
  const fodder = draft.anagramFodder.toLowerCase().trim();
  const clue = draft.clue.trim();

  return exclude.some((raw) => {
    const used = normalizeUsedClue(raw);
    return (
      used.answer === answer &&
      used.anagramFodder === fodder &&
      used.clue === clue
    );
  });
}

/** True when this answer was already used for the current inspiration. */
export function isAnswerExcluded(
  answer: string,
  exclude: UsedAnagramClue[]
): boolean {
  const normalized = normalizeAnswer(answer);
  return exclude.some((u) => normalizeUsedClue(u).answer === normalized);
}

/** True when this answer+fodder pair was already used. */
export function isPairExcluded(
  answer: string,
  fodder: string,
  exclude: UsedAnagramClue[]
): boolean {
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedFodder = fodder.toLowerCase().trim();
  return exclude.some((raw) => {
    const used = normalizeUsedClue(raw);
    return (
      used.answer === normalizedAnswer &&
      used.anagramFodder === normalizedFodder
    );
  });
}

export function filterExcludedPairs<T extends { answer: string; fodder: string }>(
  pairs: T[],
  exclude: UsedAnagramClue[]
): T[] {
  if (exclude.length === 0) return pairs;
  return pairs.filter((p) => !isAnswerExcluded(p.answer, exclude));
}

export function mergeUsedClues(
  ...lists: UsedAnagramClue[][]
): UsedAnagramClue[] {
  const seen = new Set<string>();
  const out: UsedAnagramClue[] = [];

  for (const list of lists) {
    for (const raw of list) {
      const used = normalizeUsedClue(raw);
      const key = `${used.answer}\0${used.anagramFodder}\0${used.clue}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(used);
    }
  }

  return out;
}
