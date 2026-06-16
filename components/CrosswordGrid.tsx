"use client";

import { useCallback, useRef, useState } from "react";
import {
  cellKey,
  cellInEntry,
  focusCell,
  getEntriesAtCell,
} from "@/lib/grid-utils";
import type { CrosswordPuzzle, PlacedEntry } from "@/lib/types";

interface CrosswordGridProps {
  puzzle: CrosswordPuzzle;
  activeEntry: PlacedEntry | null;
  userLetters: Record<string, string>;
  onCellChange: (key: string, letter: string) => void;
  onSelectEntry: (entry: PlacedEntry) => void;
}

export function CrosswordGrid({
  puzzle,
  activeEntry,
  userLetters,
  onCellChange,
  onSelectEntry,
}: CrosswordGridProps) {
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const focusedKeyRef = useRef<string | null>(null);
  const cellWasFocusedOnMouseDown = useRef(false);

  const syncFocusedKey = (key: string | null) => {
    focusedKeyRef.current = key;
    setFocusedKey(key);
  };

  const isActiveCell = useCallback(
    (row: number, col: number) => {
      if (!activeEntry) return false;
      return cellInEntry(row, col, activeEntry);
    },
    [activeEntry]
  );

  const focusNext = (row: number, col: number, back: boolean) => {
    if (!activeEntry) return;
    const { direction, row: er, col: ec, answer } = activeEntry;
    const len = answer.length;
    let idx = direction === "across" ? col - ec : row - er;
    idx = back ? idx - 1 : idx + 1;
    if (idx < 0 || idx >= len) return;
    const nr = direction === "across" ? er : er + idx;
    const nc = direction === "across" ? ec + idx : ec;
    focusCell(cellKey(nr, nc));
  };

  const selectEntryForFocus = (row: number, col: number) => {
    const { across, down } = getEntriesAtCell(puzzle, row, col);

    if (activeEntry && cellInEntry(row, col, activeEntry)) {
      return;
    }

    if (across && down) {
      onSelectEntry(across);
    } else {
      const entry = across ?? down;
      if (entry) onSelectEntry(entry);
    }
  };

  const handleCellClick = (row: number, col: number, key: string) => {
    const { across, down } = getEntriesAtCell(puzzle, row, col);

    if (across && down) {
      if (
        cellWasFocusedOnMouseDown.current &&
        activeEntry?.id === across.id
      ) {
        onSelectEntry(down);
      } else if (
        cellWasFocusedOnMouseDown.current &&
        activeEntry?.id === down.id
      ) {
        onSelectEntry(across);
      } else {
        onSelectEntry(across);
      }
    } else {
      const entry = across ?? down;
      if (entry) onSelectEntry(entry);
    }

    syncFocusedKey(key);
  };

  return (
    <div
      className="inline-block rounded-sm border-2 border-ink bg-ink p-0.5 shadow-lg"
      role="grid"
      aria-label="Crossword grid"
    >
      <div
        className="grid gap-px bg-ink"
        style={{
          gridTemplateColumns: `repeat(${puzzle.width}, minmax(2rem, 1fr))`,
        }}
      >
        {puzzle.grid.map((row, r) =>
          row.map((cell, c) => {
            if (cell.block) {
              return (
                <div
                  key={cellKey(r, c)}
                  className="crossword-cell block"
                  aria-hidden
                />
              );
            }

            const key = cellKey(r, c);
            const user = userLetters[key] ?? "";
            const active = isActiveCell(r, c);
            const focused = focusedKey === key;

            return (
              <div
                key={key}
                data-cell={key}
                className={`crossword-cell ${active ? "active" : ""} ${focused ? "focused" : ""}`}
                tabIndex={0}
                onMouseDown={() => {
                  cellWasFocusedOnMouseDown.current =
                    focusedKeyRef.current === key;
                }}
                onFocus={() => {
                  syncFocusedKey(key);
                  selectEntryForFocus(r, c);
                }}
                onClick={() => handleCellClick(r, c, key)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace") {
                    e.preventDefault();
                    onCellChange(key, "");
                    focusNext(r, c, true);
                  } else if (e.key === "ArrowRight") focusNext(r, c, false);
                  else if (e.key === "ArrowLeft") focusNext(r, c, true);
                  else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                    e.preventDefault();
                    onCellChange(key, e.key.toUpperCase());
                    focusNext(r, c, false);
                  }
                }}
              >
                {cell.number != null && (
                  <span className="pointer-events-none absolute left-0.5 top-0 text-[0.55rem] font-medium leading-none text-ink/70">
                    {cell.number}
                  </span>
                )}
                <span className="select-none">{user}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
