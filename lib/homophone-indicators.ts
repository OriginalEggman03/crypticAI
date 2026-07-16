import { shuffleWithSeed } from "./anagram-indicators";

/** Fair homophone indicators — speech, hearing, broadcast, and performance cues. */
export const HOMOPHONE_INDICATORS = [
  // Hearing & auditory
  "according to hearsay",
  "as heard",
  "at hearing",
  "audible",
  "audibly",
  "by the sound of it",
  "for those in earshot",
  "for those in hearing",
  "heard",
  "in earshot",
  "it sounds",
  "listening",
  "listened to",
  "one hears",
  "overheard",
  "perceived as",
  "picked up",
  "so we hear",
  "sound of",
  "sounded",
  "sounding",
  "sounds",
  "sounds like",
  "to hear",
  "to the ear",
  "we hear",
  // Speech & oral
  "aloud",
  "announced",
  "articulated",
  "as spoken",
  "as stated",
  "comes across as",
  "coming across as",
  "declared",
  "declaimed",
  "enunciated",
  "in conversation",
  "in speech",
  "mentioned",
  "oral",
  "orally",
  "or so it's said",
  "or so we hear",
  "out loud",
  "outspoken",
  "phonetically",
  "pronounced",
  "say",
  "said",
  "so it's said",
  "so we're told",
  "speaking",
  "spoken",
  "stated",
  "told",
  "uttered",
  "verbal",
  "verbally",
  "viva voce",
  "vocal",
  "voiced",
  "voice of",
  "when spoken",
  // Broadcast & reporting
  "aired",
  "broadcast",
  "for audience",
  "for auditors",
  "for eavesdroppers",
  "for listener",
  "from the radio",
  "gathered",
  "in audition",
  "in podcast",
  "in recording",
  "in report",
  "on air",
  "on record",
  "on the air",
  "on the airwaves",
  "on the phone",
  "on the radio",
  "on the tele",
  "on the telephone",
  "on transmission",
  "over the air",
  "over the airwaves",
  "over the phone",
  "podcaster's",
  "relayed",
  "reported",
  "reportedly",
  "to the audience",
  "transmitted",
  "via the radio",
  "we gather",
  // Reading aloud
  "all to hear",
  "read aloud",
  "read out",
  "when read aloud",
  // Performance
  "narrated",
  "recited",
  "shouted",
  "spouted",
  "sung",
] as const;

/**
 * Prefer other indicators when possible — Claude and templates overuse these
 * trailing "we hear" endings.
 */
export const OVERUSED_HOMOPHONE_INDICATORS = new Set([
  "we hear",
  "so we hear",
  "or so we hear",
  "heard",
  "one hears",
  "to hear",
  "all to hear",
]);

/** Soft-avoid when archive use reaches this count (homophone clues only). */
export const HOMOPHONE_HOT_INDICATOR_THRESHOLD = 2;

export function normalizeHomophoneIndicatorKey(phrase: string): string {
  return phrase.toLowerCase().trim().replace(/\s+/g, " ");
}

export function isOverusedHomophoneIndicator(phrase: string): boolean {
  return OVERUSED_HOMOPHONE_INDICATORS.has(
    normalizeHomophoneIndicatorKey(phrase)
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripClueEnumeration(clue: string): string {
  return clue.replace(/\(\d+(?:,\s*\d+)*\)\s*$/, "").trim();
}

/** Longest matching homophone indicator phrase in the clue, if any. */
export function extractHomophoneIndicatorFromClue(clue: string): string | null {
  const body = stripClueEnumeration(clue);
  const sorted = [...HOMOPHONE_INDICATORS].sort((a, b) => b.length - a.length);

  for (const phrase of sorted) {
    const pattern = phrase.includes(" ")
      ? escapeRegExp(phrase)
      : `\\b${escapeRegExp(phrase)}\\b`;
    if (new RegExp(pattern, "i").test(body)) {
      return phrase;
    }
  }

  return null;
}

/** True when the clue contains a fair homophone indicator. */
export function clueHasHomophoneIndicator(clue: string): boolean {
  return extractHomophoneIndicatorFromClue(clue) !== null;
}

export function pickHomophoneIndicatorPhrases(options: {
  seed: string;
  avoid?: string[];
  maxItems?: number;
  /** Archive usage counts for homophone indicators (lower = preferred). */
  archiveCounts?: Map<string, number>;
}): string[] {
  const avoid = new Set(
    (options.avoid ?? []).map(normalizeHomophoneIndicatorKey)
  );
  const archiveCounts = options.archiveCounts ?? new Map<string, number>();
  const maxItems = options.maxItems ?? 12;

  const pool = HOMOPHONE_INDICATORS.filter(
    (phrase) => !avoid.has(normalizeHomophoneIndicatorKey(phrase))
  );

  const preferred = pool.filter(
    (phrase) => !isOverusedHomophoneIndicator(phrase)
  );
  const fallback = pool.filter((phrase) => isOverusedHomophoneIndicator(phrase));

  const rank = (phrases: readonly string[]): string[] => {
    const ranked = phrases
      .map((phrase) => ({
        phrase,
        uses: archiveCounts.get(normalizeHomophoneIndicatorKey(phrase)) ?? 0,
      }))
      .sort((a, b) => a.uses - b.uses || a.phrase.localeCompare(b.phrase));

    return shuffleWithSeed(
      ranked.map((item) => item.phrase),
      `${options.seed}|${ranked.map((r) => r.uses).join(",")}`
    );
  };

  const out = rank(preferred);
  if (out.length >= maxItems) return out.slice(0, maxItems);

  // Only dip into overused family if the preferred pool is thin.
  return [...out, ...rank(fallback)].slice(0, maxItems);
}
