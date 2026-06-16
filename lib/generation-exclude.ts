import {
  filterExcludedPairs,
  isAnswerExcluded,
  mergeUsedClues,
  usedAnswersFromClues,
} from "@/lib/clue-history";
import {
  normalizeInspirationKey,
  searchArchivedClues,
} from "@/lib/db/clue-archive";
import type { UsedAnagramClue } from "@/lib/types";

/** Archived clues for this inspiration (easy + hard), matched by normalized theme key. */
export function archivedCluesForInspiration(
  inspiration: string
): UsedAnagramClue[] {
  const key = normalizeInspirationKey(inspiration);
  if (!key) return [];

  return searchArchivedClues({ inspiration, limit: 200 })
    .filter((row) => normalizeInspirationKey(row.inspiration) === key)
    .map((row) => ({
      answer: row.answer,
      anagramFodder: row.anagramFodder,
      clue: row.clue,
      anagramIndicator: row.anagramIndicator ?? undefined,
    }));
}

/** Session retries + archive — answers must stay unique for this inspiration. */
export function buildGenerationExcludeList(
  inspiration: string,
  sessionExclude: UsedAnagramClue[]
): UsedAnagramClue[] {
  return mergeUsedClues(
    sessionExclude,
    archivedCluesForInspiration(inspiration)
  );
}

export {
  filterExcludedPairs,
  isAnswerExcluded,
  usedAnswersFromClues,
};
