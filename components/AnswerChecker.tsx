"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  answerCheckerWordLengths,
  checkAnswerLetters,
  emptyCheckerCells,
  emptyCheckerLocks,
  isAnswerComplete,
  nextEditableCellIndex,
  prevEditableCellIndex,
  revealAnswerLetters,
  type AnswerCheckerState,
} from "@/lib/answer-checker";

interface AnswerCheckerProps {
  answer: string;
  clue: string;
}

function focusCheckerCell(index: number) {
  const el = document.querySelector<HTMLElement>(
    `[data-answer-cell="${index}"]`
  );
  el?.focus();
}

export function AnswerChecker({ answer, clue }: AnswerCheckerProps) {
  const wordLengths = useMemo(
    () => answerCheckerWordLengths(clue, answer),
    [clue, answer]
  );
  const totalCells = wordLengths.reduce((sum, len) => sum + len, 0);

  const [state, setState] = useState<AnswerCheckerState>(() => ({
    cells: emptyCheckerCells(wordLengths),
    locked: emptyCheckerLocks(wordLengths),
  }));

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setState({
      cells: emptyCheckerCells(wordLengths),
      locked: emptyCheckerLocks(wordLengths),
    });
    inputRefs.current = [];
  }, [answer, clue, totalCells]);

  const solved = isAnswerComplete(state, answer);

  const setCell = (index: number, letter: string) => {
    if (state.locked[index]) return;
    setState((prev) => {
      const cells = [...prev.cells];
      cells[index] = letter.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
      return { ...prev, cells };
    });
  };

  const focusNextEditable = useCallback(
    (fromIndex: number, locked: boolean[]) => {
      const next = nextEditableCellIndex(fromIndex, locked, wordLengths);
      if (next !== null) {
        requestAnimationFrame(() => focusCheckerCell(next));
      }
    },
    [wordLengths]
  );

  const handleLetterInput = (index: number, raw: string) => {
    if (state.locked[index]) return;

    const letter = raw.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
    if (!letter) {
      setCell(index, "");
      return;
    }

    setCell(index, letter);
    focusNextEditable(index, state.locked);
  };

  const handleCheck = () => {
    setState((prev) => {
      const next = checkAnswerLetters(prev, answer);
      const firstOpen = next.locked.findIndex((locked) => !locked);
      if (firstOpen >= 0) {
        requestAnimationFrame(() => focusCheckerCell(firstOpen));
      }
      return next;
    });
  };

  const handleReveal = () => {
    setState(revealAnswerLetters(wordLengths, answer));
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (state.locked[index]) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      if (state.cells[index]) {
        setCell(index, "");
      } else {
        const prev = prevEditableCellIndex(index, state.locked, wordLengths);
        if (prev !== null) focusCheckerCell(prev);
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = prevEditableCellIndex(index, state.locked, wordLengths);
      if (prev !== null) focusCheckerCell(prev);
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = nextEditableCellIndex(index, state.locked, wordLengths);
      if (next !== null) focusCheckerCell(next);
      return;
    }

    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      handleLetterInput(index, e.key);
    }
  };

  if (totalCells === 0) return null;

  let cellIndex = 0;

  return (
    <div className="mt-6 border-t border-ink/10 pt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">
          Answer checker
        </h3>
        {solved && (
          <p className="text-sm font-medium text-green-700">Complete</p>
        )}
      </div>

      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-2"
        role="group"
        aria-label="Answer letter grid"
      >
        {wordLengths.map((wordLen, wordIdx) => {
          const wordCells = Array.from({ length: wordLen }, () => {
            const index = cellIndex;
            cellIndex += 1;
            return index;
          });

          return (
            <div key={`word-${wordIdx}`} className="flex items-center gap-1">
              {wordCells.map((index) => {
                const locked = state.locked[index];
                const value = state.cells[index] ?? "";

                return (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={1}
                    value={value}
                    readOnly={locked}
                    disabled={locked}
                    data-answer-cell={index}
                    aria-label={`Letter ${index + 1} of ${totalCells}`}
                    className={`answer-checker-cell ${locked ? "answer-checker-cell-locked" : ""}`}
                    onChange={(e) => handleLetterInput(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onFocus={(e) => e.target.select()}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCheck}
          disabled={solved || !state.cells.some((cell) => cell.length > 0)}
          className="rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-cream/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Check
        </button>
        <button
          type="button"
          onClick={handleReveal}
          disabled={solved}
          className="rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-cream/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reveal
        </button>
      </div>
    </div>
  );
}
