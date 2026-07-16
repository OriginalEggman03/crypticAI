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
import { HOMOPHONE_ARCHIVE_INSPIRATION } from "@/lib/site-config";
import type { UsedAnagramClue } from "@/lib/types";

/** Stored as `inspiration` when archiving homophone clues (no theme). */
export { HOMOPHONE_ARCHIVE_INSPIRATION };

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

/** Archived homophone clues (shared archive table, homophone sentinel inspiration). */
export function archivedHomophoneClues(): UsedAnagramClue[] {
  const key = normalizeInspirationKey(HOMOPHONE_ARCHIVE_INSPIRATION);
  if (!key) return [];

  return searchArchivedClues({
    inspiration: HOMOPHONE_ARCHIVE_INSPIRATION,
    limit: 200,
  })
    .filter((row) => normalizeInspirationKey(row.inspiration) === key)
    .map((row) => ({
      answer: row.answer,
      anagramFodder: row.anagramFodder,
      clue: row.clue,
      anagramIndicator: row.anagramIndicator ?? undefined,
    }));
}

/** Session retries + homophone archive — answers must stay unique. */
export function buildHomophoneExcludeList(
  sessionExclude: UsedAnagramClue[] = []
): UsedAnagramClue[] {
  return mergeUsedClues(sessionExclude, archivedHomophoneClues());
}

export {
  filterExcludedPairs,
  isAnswerExcluded,
  usedAnswersFromClues,
};
