import {
  ANAGRAM_INDICATORS,
  ANAGRAM_INDICATORS_FOR_PROMPTS,
  extractIndicatorFromClue,
  MULTI_WORD_ANAGRAM_INDICATORS,
  normalizeIndicatorKey,
  OVERUSED_ANAGRAM_INDICATORS,
  shuffleWithSeed,
} from "./anagram-indicators";
import { searchArchivedClues } from "./db/clue-archive";

/** Global archive uses at or above this count are treated as hot. */
export const HOT_INDICATOR_THRESHOLD = 3;

const INDICATOR_CACHE_MS = 5 * 60 * 1000;

export type IndicatorArchiveCounts = Map<string, number>;

export interface IndicatorGuidance {
  /** Theme-specific + globally hot indicators to avoid. */
  avoid: string[];
  /** Indicators already used for this inspiration. */
  themeAvoid: string[];
  /** Globally overused indicators from the archive. */
  hot: string[];
  /** Rare indicators the model should prefer when they fit. */
  prefer: string[];
  archiveCounts: IndicatorArchiveCounts;
}

let cachedCounts: { at: number; counts: IndicatorArchiveCounts } | null = null;

export function invalidateIndicatorUsageCache(): void {
  cachedCounts = null;
}

export function getIndicatorUsageCounts(): IndicatorArchiveCounts {
  if (cachedCounts && Date.now() - cachedCounts.at < INDICATOR_CACHE_MS) {
    return cachedCounts.counts;
  }

  const clues = searchArchivedClues({ limit: 500 });
  const counts: IndicatorArchiveCounts = new Map();

  for (const clue of clues) {
    const raw =
      clue.anagramIndicator?.trim() ||
      extractIndicatorFromClue(clue.clue) ||
      "";
    if (!raw) continue;
    const key = normalizeIndicatorKey(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  cachedCounts = { at: Date.now(), counts };
  return counts;
}

export function isHotArchiveIndicator(
  phrase: string,
  archiveCounts: IndicatorArchiveCounts
): boolean {
  const key = normalizeIndicatorKey(phrase);
  return (archiveCounts.get(key) ?? 0) >= HOT_INDICATOR_THRESHOLD;
}

export function buildIndicatorGuidance(options: {
  themeAvoid: string[];
  archiveCounts?: IndicatorArchiveCounts;
  seed?: string;
}): IndicatorGuidance {
  const archiveCounts = options.archiveCounts ?? getIndicatorUsageCounts();
  const themeAvoid = [
    ...new Set(options.themeAvoid.map(normalizeIndicatorKey).filter(Boolean)),
  ];

  const hot = [...archiveCounts.entries()]
    .filter(([, count]) => count >= HOT_INDICATOR_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);

  const avoid = [...new Set([...themeAvoid, ...hot])];

  const pool = [
    ...MULTI_WORD_ANAGRAM_INDICATORS,
    ...ANAGRAM_INDICATORS_FOR_PROMPTS,
    ...ANAGRAM_INDICATORS,
  ].filter(
    (phrase, index, all) =>
      all.findIndex((p) => normalizeIndicatorKey(p) === normalizeIndicatorKey(phrase)) ===
      index
  );

  const prefer = shuffleWithSeed(
    pool.filter((phrase) => {
      const key = normalizeIndicatorKey(phrase);
      return (
        !archiveCounts.has(key) &&
        !avoid.includes(key) &&
        !OVERUSED_ANAGRAM_INDICATORS.has(key)
      );
    }),
    options.seed?.trim() || "indicator-prefer"
  ).slice(0, 20);

  return {
    avoid,
    themeAvoid,
    hot,
    prefer,
    archiveCounts,
  };
}
