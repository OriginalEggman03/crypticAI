import type { AnagramDifficulty } from "./types";

export interface AnswerLengthBounds {
  minLength: number;
  /** null means no upper limit on total answer letters. */
  maxLength: number | null;
}

export function answerLengthBounds(
  difficulty: AnagramDifficulty = "easy"
): AnswerLengthBounds {
  if (difficulty === "hard") {
    return { minLength: 8, maxLength: null };
  }
  return { minLength: 3, maxLength: 10 };
}

export function answerLengthInBounds(
  letterCount: number,
  bounds: AnswerLengthBounds
): boolean {
  if (letterCount < bounds.minLength) return false;
  if (bounds.maxLength !== null && letterCount > bounds.maxLength) return false;
  return true;
}

/** Upper bound for scanning single dictionary words by length. */
export function dictionaryScanMaxLength(
  bounds: AnswerLengthBounds,
  availableLengths: Iterable<number>
): number {
  if (bounds.maxLength !== null) return bounds.maxLength;
  let max = bounds.minLength;
  for (const len of availableLengths) {
    if (len >= bounds.minLength) max = Math.max(max, len);
  }
  return max;
}

export function answerLengthRuleForPrompt(bounds: AnswerLengthBounds): string {
  if (bounds.maxLength === null) {
    return `Total letters per answer: at least ${bounds.minLength} (ignore spaces). No maximum. UPPERCASE in JSON.`;
  }
  return `Total letters per answer: ${bounds.minLength}–${bounds.maxLength} (ignore spaces). UPPERCASE in JSON.`;
}

export function difficultyLabel(difficulty: AnagramDifficulty): string {
  return difficulty === "hard" ? "Hard" : "Easy";
}
