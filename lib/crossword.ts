import type {
  CrosswordPuzzle,
  GridCell,
  PlacedEntry,
  PuzzleEntry,
} from "./types";

function normalizeAnswer(answer: string): string {
  return answer.toUpperCase().replace(/[^A-Z]/g, "");
}

function emptyCell(): GridCell {
  return {
    letter: null,
    block: true,
    number: null,
    acrossId: null,
    downId: null,
  };
}

function canPlace(
  grid: GridCell[][],
  answer: string,
  row: number,
  col: number,
  direction: "across" | "down"
): boolean {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;
  const endRow = row + dr * (answer.length - 1);
  const endCol = col + dc * (answer.length - 1);

  if (row < 0 || col < 0 || endRow >= height || endCol >= width) return false;

  const beforeRow = row - dr;
  const beforeCol = col - dc;
  if (
    beforeRow >= 0 &&
    beforeCol >= 0 &&
    beforeRow < height &&
    beforeCol < width &&
    !grid[beforeRow][beforeCol].block
  ) {
    return false;
  }

  const afterRow = endRow + dr;
  const afterCol = endCol + dc;
  if (
    afterRow >= 0 &&
    afterCol >= 0 &&
    afterRow < height &&
    afterCol < width &&
    !grid[afterRow][afterCol].block
  ) {
    return false;
  }

  for (let i = 0; i < answer.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid[r][c];
    const ch = answer[i];

    if (!cell.block && cell.letter !== null && cell.letter !== ch) {
      return false;
    }

    const perpBefore =
      direction === "across"
        ? r > 0 && !grid[r - 1][c].block
        : c > 0 && !grid[r][c - 1].block;
    const perpAfter =
      direction === "across"
        ? r < height - 1 && !grid[r + 1][c].block
        : c < width - 1 && !grid[r][c + 1].block;

    if (cell.block && (perpBefore || perpAfter)) {
      const isIntersection = !cell.block && cell.letter === ch;
      if (!isIntersection) return false;
    }
  }

  return true;
}

function placeWord(
  grid: GridCell[][],
  entry: PuzzleEntry,
  row: number,
  col: number,
  direction: "across" | "down"
): void {
  const answer = normalizeAnswer(entry.answer);
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;

  for (let i = 0; i < answer.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid[r][c];
    cell.block = false;
    cell.letter = answer[i];
    if (direction === "across") cell.acrossId = entry.id;
    else cell.downId = entry.id;
  }
}

function assignNumbers(placed: PlacedEntry[]): void {
  const starts = [...placed].sort((a, b) =>
    a.row !== b.row ? a.row - b.row : a.col - b.col
  );
  let n = 1;
  const used = new Set<string>();

  for (const entry of starts) {
    const key = `${entry.row},${entry.col}`;
    if (!used.has(key)) {
      entry.number = n++;
      used.add(key);
    } else {
      const existing = starts.find(
        (e) => e.row === entry.row && e.col === entry.col && e.number > 0
      );
      entry.number = existing?.number ?? n++;
    }
  }
}

export function buildCrossword(
  title: string,
  subtitle: string,
  rawEntries: PuzzleEntry[]
): CrosswordPuzzle | null {
  const entries = rawEntries
    .map((e, i) => ({
      ...e,
      id: e.id || `e${i}`,
      answer: normalizeAnswer(e.answer),
    }))
    .filter((e) => e.answer.length >= 3)
    .sort((a, b) => b.answer.length - a.answer.length);

  if (entries.length < 4) return null;

  const size = 21;
  const grid: GridCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, emptyCell)
  );

  const placed: PlacedEntry[] = [];
  const center = Math.floor(size / 2);

  const first = entries[0];
  const firstCol = center - Math.floor(first.answer.length / 2);
  placeWord(grid, first, center, firstCol, "across");
  placed.push({
    ...first,
    row: center,
    col: firstCol,
    direction: "across",
    number: 0,
  });

  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    let best: {
      row: number;
      col: number;
      direction: "across" | "down";
      score: number;
    } | null = null;

    for (const existing of placed) {
      for (let pi = 0; pi < existing.answer.length; pi++) {
        for (let ni = 0; ni < entry.answer.length; ni++) {
          if (existing.answer[pi] !== entry.answer[ni]) continue;

          const direction =
            existing.direction === "across" ? "down" : "across";
          let row: number;
          let col: number;

          if (existing.direction === "across") {
            row = existing.row - ni;
            col = existing.col + pi;
          } else {
            row = existing.row + pi;
            col = existing.col - ni;
          }

          if (!canPlace(grid, entry.answer, row, col, direction)) continue;

          const intersections = entry.answer
            .split("")
            .filter((ch, idx) => {
              const r = row + (direction === "down" ? idx : 0);
              const c = col + (direction === "across" ? idx : 0);
              return !grid[r][c].block && grid[r][c].letter === ch;
            }).length;

          const score = intersections * 10 + (direction === "down" ? 1 : 0);
          if (!best || score > best.score) {
            best = { row, col, direction, score };
          }
        }
      }
    }

    if (!best) continue;

    placeWord(grid, entry, best.row, best.col, best.direction);
    placed.push({
      ...entry,
      row: best.row,
      col: best.col,
      direction: best.direction,
      number: 0,
    });
  }

  if (placed.length < 4) return null;

  let minR = size;
  let minC = size;
  let maxR = 0;
  let maxC = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c].block) {
        minR = Math.min(minR, r);
        minC = Math.min(minC, c);
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
      }
    }
  }

  const pad = 1;
  minR = Math.max(0, minR - pad);
  minC = Math.max(0, minC - pad);
  maxR = Math.min(size - 1, maxR + pad);
  maxC = Math.min(size - 1, maxC + pad);

  const height = maxR - minR + 1;
  const width = maxC - minC + 1;
  const trimmed: GridCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      const src = grid[minR + r][minC + c];
      return { ...src };
    })
  );

  const adjusted: PlacedEntry[] = placed.map((p) => ({
    ...p,
    row: p.row - minR,
    col: p.col - minC,
  }));

  assignNumbers(adjusted);

  for (const entry of adjusted) {
    const cell = trimmed[entry.row][entry.col];
    cell.number = entry.number;
  }

  return {
    title,
    subtitle,
    entries: adjusted,
    grid: trimmed,
    width,
    height,
  };
}
