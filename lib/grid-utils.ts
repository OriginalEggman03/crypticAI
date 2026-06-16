import type { CrosswordPuzzle, PlacedEntry } from "./types";

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function fillEntryLetters(
  puzzle: CrosswordPuzzle,
  entry: PlacedEntry,
  userLetters: Record<string, string>
): Record<string, string> {
  const next = { ...userLetters };
  const dr = entry.direction === "down" ? 1 : 0;
  const dc = entry.direction === "across" ? 1 : 0;

  for (let i = 0; i < entry.answer.length; i++) {
    const r = entry.row + dr * i;
    const c = entry.col + dc * i;
    const letter = puzzle.grid[r][c].letter;
    if (letter) next[cellKey(r, c)] = letter;
  }

  return next;
}

export function checkAllLetters(
  puzzle: CrosswordPuzzle,
  userLetters: Record<string, string>
): Record<string, string> {
  const next = { ...userLetters };

  for (let r = 0; r < puzzle.height; r++) {
    for (let c = 0; c < puzzle.width; c++) {
      const cell = puzzle.grid[r][c];
      if (cell.block) continue;

      const key = cellKey(r, c);
      const user = next[key];
      if (!user) continue;

      if (user.toUpperCase() !== (cell.letter ?? "")) {
        delete next[key];
      }
    }
  }

  return next;
}

export function entryStartCellKey(entry: PlacedEntry): string {
  return cellKey(entry.row, entry.col);
}

export function focusCell(key: string): void {
  const cell = document.querySelector(
    `[data-cell="${key}"]`
  ) as HTMLElement | null;
  cell?.focus();
}

export function entryLabel(entry: PlacedEntry): string {
  const dir = entry.direction === "across" ? "Across" : "Down";
  return `${entry.number} ${dir}`;
}

export function cellInEntry(
  row: number,
  col: number,
  entry: PlacedEntry
): boolean {
  if (entry.direction === "across") {
    return (
      row === entry.row &&
      col >= entry.col &&
      col < entry.col + entry.answer.length
    );
  }
  return (
    col === entry.col &&
    row >= entry.row &&
    row < entry.row + entry.answer.length
  );
}

export function getEntriesAtCell(
  puzzle: CrosswordPuzzle,
  row: number,
  col: number
): { across: PlacedEntry | null; down: PlacedEntry | null } {
  const across =
    puzzle.entries.find(
      (e) =>
        e.direction === "across" && cellInEntry(row, col, e)
    ) ?? null;
  const down =
    puzzle.entries.find(
      (e) => e.direction === "down" && cellInEntry(row, col, e)
    ) ?? null;
  return { across, down };
}
