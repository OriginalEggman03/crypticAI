import type { CrosswordPuzzle } from "./types";

/** Fixed demo grid with consistent intersections. */
export function getSamplePuzzle(): CrosswordPuzzle {
  const entries = [
    {
      id: "e0",
      answer: "LATTE",
      clue: "Coffee order for someone who paints watercolours (5)",
      clueType: "charade",
      anagramFodder: null,
      row: 1,
      col: 1,
      direction: "across" as const,
      number: 1,
    },
    {
      id: "e1",
      answer: "BREAD",
      clue: "Sourdough output — head baker's pride (5)",
      clueType: "charade",
      anagramFodder: null,
      row: 1,
      col: 5,
      direction: "down" as const,
      number: 2,
    },
    {
      id: "e2",
      answer: "TENOR",
      clue: "Sax type heard at the jazz club, we hear (5)",
      clueType: "homophone",
      anagramFodder: null,
      row: 1,
      col: 3,
      direction: "down" as const,
      number: 3,
    },
    {
      id: "e3",
      answer: "OPERA",
      clue: "Drama for Mum — ooze round a theatre piece (5)",
      clueType: "container",
      anagramFodder: null,
      row: 5,
      col: 3,
      direction: "across" as const,
      number: 5,
    },
    {
      id: "e4",
      answer: "ALPACA",
      clue: "Woolly favourite from the craft fair, a pack animal (6)",
      clueType: "hidden",
      anagramFodder: null,
      row: 7,
      col: 1,
      direction: "across" as const,
      number: 6,
    },
  ];

  const width = 9;
  const height = 9;
  const grid = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      letter: null as string | null,
      block: true,
      number: null as number | null,
      acrossId: null as string | null,
      downId: null as string | null,
    }))
  );

  for (const entry of entries) {
    const dr = entry.direction === "down" ? 1 : 0;
    const dc = entry.direction === "across" ? 1 : 0;
    for (let i = 0; i < entry.answer.length; i++) {
      const r = entry.row + dr * i;
      const c = entry.col + dc * i;
      const cell = grid[r][c];
      if (cell.letter && cell.letter !== entry.answer[i]) {
        throw new Error(`Sample grid mismatch at ${r},${c}`);
      }
      cell.block = false;
      cell.letter = entry.answer[i];
      if (entry.direction === "across") cell.acrossId = entry.id;
      else cell.downId = entry.id;
      if (i === 0) cell.number = entry.number;
    }
  }

  return {
    title: "Saturday Afternoon",
    subtitle: "Demo puzzle: jazz, bread, and a trip to the theatre",
    entries,
    grid,
    width,
    height,
  };
}
