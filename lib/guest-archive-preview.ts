import type { ArchivedClue } from "@/lib/types";

/** Fixed guest showcase — always three curated clues, independent of archive search order. */
export const GUEST_ARCHIVE_PREVIEW_CLUES: ArchivedClue[] = [
  {
    id: -1,
    inspiration: "Iconic Premier League football clubs and stadiums",
    difficulty: "easy",
    answer: "BRIGHTON",
    clue: "Seaside club is hot! Bring bananas (8)",
    originalClue: "Seaside club with hot bring out of sorts (8)",
    improvementNotes:
      'Original surface "hot bring out of sorts" isn\'t really grammatical or thematic. By splitting the "hot" and "bring" into two sentences and switching the anagram indicator to bananas we can make a much smoother surface. Bananas is both a noun (a fruit) and a verb implying anagramming.',
    anagramFodder: "bring hot",
    anagramIndicator: "out of sorts",
    rating: 5,
    createdAt: "2026-06-29 20:53:35",
  },
  {
    id: -2,
    inspiration: "Iconic Monty Python sketches and characters",
    difficulty: "easy",
    answer: "MR CREOSOTE",
    clue: "Secret room made fresh for wafer-thin diner (2,8)",
    originalClue: null,
    improvementNotes: null,
    anagramFodder: "secret room",
    anagramIndicator: "made fresh",
    rating: 5,
    createdAt: "2026-06-19 14:45:12",
  },
  {
    id: -3,
    inspiration: "James Bond Film Titles",
    difficulty: "hard",
    answer: "THE SPY WHO LOVED ME",
    clue: "Hdtv employee show in bits for this 007 thriller (3,3,3,5,2)",
    originalClue: null,
    improvementNotes: null,
    anagramFodder: "employee hdtv show",
    anagramIndicator: "in bits",
    rating: 4,
    createdAt: "2026-06-27 19:02:59",
  },
];

export const GUEST_ARCHIVE_PREVIEW_COUNT = GUEST_ARCHIVE_PREVIEW_CLUES.length;
