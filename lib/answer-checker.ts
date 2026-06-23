import { answerLetters, answerWords, parseEnumeration } from "./answer-format";

/** Word lengths for answer-checker cells — clue enumeration first, then answer shape. */
export function answerCheckerWordLengths(
  clue: string,
  answer: string
): number[] {
  const fromClue = parseEnumeration(clue);
  const words = answerWords(answer);
  const letters = answerLetters(answer);

  if (fromClue?.length) {
    if (words.length > 1 && fromClue.length === words.length) {
      return fromClue;
    }
    if (fromClue.length === 1 && fromClue[0] === letters.length) {
      if (words.length > 1) {
        return words.map((w) => w.length);
      }
      return fromClue;
    }
  }

  if (words.length > 0) {
    return words.map((w) => w.length);
  }

  return letters.length > 0 ? [letters.length] : [];
}

export function emptyCheckerCells(wordLengths: number[]): string[] {
  const total = wordLengths.reduce((sum, len) => sum + len, 0);
  return Array.from({ length: total }, () => "");
}

export function emptyCheckerLocks(wordLengths: number[]): boolean[] {
  const total = wordLengths.reduce((sum, len) => sum + len, 0);
  return Array.from({ length: total }, () => false);
}

export interface AnswerCheckerState {
  cells: string[];
  locked: boolean[];
}

export function checkAnswerLetters(
  state: AnswerCheckerState,
  answer: string
): AnswerCheckerState {
  const correct = answerLetters(answer);
  const cells = [...state.cells];
  const locked = [...state.locked];

  for (let i = 0; i < cells.length; i++) {
    if (locked[i]) continue;

    const guess = cells[i]?.toUpperCase().replace(/[^A-Z]/g, "") ?? "";
    if (guess && guess === correct[i]) {
      cells[i] = guess;
      locked[i] = true;
    } else {
      cells[i] = "";
    }
  }

  return { cells, locked };
}

export function revealAnswerLetters(
  wordLengths: number[],
  answer: string
): AnswerCheckerState {
  const correct = answerLetters(answer);
  return {
    cells: correct.split(""),
    locked: emptyCheckerLocks(wordLengths).map(() => true),
  };
}

export function isAnswerComplete(
  state: AnswerCheckerState,
  answer: string
): boolean {
  const correct = answerLetters(answer);
  if (state.cells.length !== correct.length) return false;
  return state.cells.every(
    (cell, i) => state.locked[i] && cell.toUpperCase() === correct[i]
  );
}

/** Inclusive cell index range for the word containing `cellIndex`. */
export function cellWordRange(
  cellIndex: number,
  wordLengths: number[]
): { start: number; end: number } | null {
  let start = 0;
  for (const len of wordLengths) {
    const end = start + len;
    if (cellIndex >= start && cellIndex < end) {
      return { start, end };
    }
    start = end;
  }
  return null;
}

/** Next editable cell in the same word, skipping locked (green) cells. */
export function nextEditableCellIndex(
  fromIndex: number,
  locked: boolean[],
  wordLengths: number[]
): number | null {
  const range = cellWordRange(fromIndex, wordLengths);
  if (!range) return null;

  for (let i = fromIndex + 1; i < range.end; i++) {
    if (!locked[i]) return i;
  }
  return null;
}

/** Previous editable cell in the same word, skipping locked (green) cells. */
export function prevEditableCellIndex(
  fromIndex: number,
  locked: boolean[],
  wordLengths: number[]
): number | null {
  const range = cellWordRange(fromIndex, wordLengths);
  if (!range) return null;

  for (let i = fromIndex - 1; i >= range.start; i--) {
    if (!locked[i]) return i;
  }
  return null;
}
