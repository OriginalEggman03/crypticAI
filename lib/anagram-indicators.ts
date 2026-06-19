/** Single-word fair anagram indicators — used in programmatic rotation. */

export const ANAGRAM_INDICATORS = [
  "broken",
  "confused",
  "upset",
  "strange",
  "weird",
  "bizarre",
  "stirred",
  "tangled",
  "twisted",
  "rough",
  "wrong",
  "reformed",
  "altered",
  "novel",
  "fresh",
  "wild",
  "crooked",
  "dancing",
  "drunk",
  "disordered",
  "odd",
  "messy",
  "scattered",
  "unsettled",
  "peculiar",
  "torn",
  "bats",
  "off",
  "new",
  "offbeat",
  // Lower priority — deprioritised in pickIndicatorPhrases
  "mixed",
  "jumbled",
  "shuffled",
  "scrambled",
  "muddled",
] as const;

/** Multi-word anagram indicators — often read more naturally in clue surfaces. */
export const MULTI_WORD_ANAGRAM_INDICATORS = [
  "in chaos",
  "in disarray",
  "in a mess",
  "in a muddle",
  "in turmoil",
  "in disorder",
  "in confusion",
  "in a tangle",
  "in knots",
  "in ferment",
  "in flux",
  "at sea",
  "in trouble",
  "on the move",
  "going wild",
  "out of order",
  "out of joint",
  "all over the place",
  "gone astray",
  "gone wrong",
  "wrong way round",
  "the wrong way",
  "may be broken",
  "could be broken",
  "perhaps broken",
  "possibly broken",
  "needs sorting",
  "to be sorted",
  "rather odd",
  "looking strange",
  "sounding odd",
  "not right",
  "somewhat odd",
  "a bit off",
  "in bits",
  "turned around",
  "back to front",
  "in a spin",
  "in a whirl",
  "in a state",
  "in disgrace",
  "on the blink",
  "on the fritz",
  "out of sorts",
  "out of line",
  "all awry",
  "somewhat wild",
  "rather wild",
  "might be new",
  "could be new",
  "seemingly new",
  "apparently new",
  "needs repair",
  "needs change",
  "needs converting",
  "badly made",
  "poorly made",
  "made anew",
  "made fresh",
  "freshly made",
  "newly made",
  "inadequately made",
] as const;

/** Deprioritised in programmatic selection — still valid but overused in AI output. */
export const OVERUSED_ANAGRAM_INDICATORS = new Set([
  "scrambled",
  "muddled",
  "mixed",
  "jumbled",
  "shuffled",
]);

/** Verifier-accepted single words not rotated programmatically. */
export const EXTRA_ANAGRAM_INDICATORS = [
  "mad",
  "bad",
  "repair",
  "change",
  "convert",
  "organ",
  "inadequate",
  "anagram",
] as const;

export const ANAGRAM_INDICATORS_FOR_PROMPTS = [
  ...ANAGRAM_INDICATORS,
  ...EXTRA_ANAGRAM_INDICATORS,
] as const;

export type AnagramIndicator = (typeof ANAGRAM_INDICATORS)[number];
export type IndicatorPhrase = string;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripClueEnumeration(clue: string): string {
  return clue.replace(/\(\d+(?:,\s*\d+)*\)\s*$/, "").trim();
}

const SINGLE_WORD_ANAGRAM_RE = new RegExp(
  `\\b(${[
    ...ANAGRAM_INDICATORS,
    ...EXTRA_ANAGRAM_INDICATORS,
    "anagram",
  ]
    .filter((w, i, a) => a.indexOf(w) === i)
    .map(escapeRegExp)
    .join("|")})\\b`,
  "i"
);

/** Fair indicators for setter/repair examples — no single- vs multi-word bias. */
export function anagramIndicatorExamplesForPrompt(
  avoid: string[] = [],
  archiveCounts: Map<string, number> = new Map(),
  seed = "indicator-examples"
): string {
  const avoidSet = new Set(avoid.map(normalizeIndicatorKey));
  return indicatorOptionsForPrompt(avoidSet, 36, archiveCounts, seed);
}

/** Shuffled fair indicators for polish/refine prompts (excludes avoided and overused). */
export function indicatorOptionsForPrompt(
  avoid: Set<string>,
  maxItems = 48,
  archiveCounts: Map<string, number> = new Map(),
  seed = "ind-prompt"
): string {
  const pool = [
    ...MULTI_WORD_ANAGRAM_INDICATORS,
    ...ANAGRAM_INDICATORS_FOR_PROMPTS,
  ].filter(
    (p) =>
      !avoid.has(normalizeIndicatorKey(p)) &&
      !OVERUSED_ANAGRAM_INDICATORS.has(normalizeIndicatorKey(p))
  );

  const ranked = pool
    .map((phrase) => ({
      phrase,
      uses: archiveCounts.get(normalizeIndicatorKey(phrase)) ?? 0,
    }))
    .sort((a, b) => a.uses - b.uses || a.phrase.localeCompare(b.phrase));

  return shuffleWithSeed(
    ranked.map((item) => item.phrase),
    `${seed}-${[...avoid].sort().join("|")}`
  )
    .slice(0, maxItems)
    .join("; ");
}

export interface IndicatorChoiceGuidanceOptions {
  prefer?: string[];
  hot?: string[];
  themeAvoid?: string[];
  archiveCounts?: Map<string, number>;
  seed?: string;
}

export function indicatorChoiceGuidance(
  avoidIndicators: string[] = [],
  options: IndicatorChoiceGuidanceOptions = {}
): string {
  const avoid = new Set(avoidIndicators.map(normalizeIndicatorKey));
  const archiveCounts = options.archiveCounts ?? new Map();
  const overused = [...OVERUSED_ANAGRAM_INDICATORS].join(", ");
  const fairOptions = indicatorOptionsForPrompt(
    avoid,
    48,
    archiveCounts,
    options.seed ?? "indicator-guidance"
  );

  const lines = [
    "Choose ONE fair anagram indicator that makes the whole sentence read most naturally.",
    "Single-word and multi-word indicators are equally valid — judge by grammar and flow, not by length.",
    "Vary your choice; do not default to the same indicator every time.",
  ];

  if (options.prefer?.length) {
    lines.push(
      `PREFER (rare in our archive — use one if it fits grammatically): ${options.prefer.join("; ")}`
    );
  }

  lines.push(`Fair options include: ${fairOptions}`);
  lines.push(`Avoid unless nothing else fits: ${overused}`);

  if (options.hot?.length) {
    lines.push(
      `AVOID (overused in our archive): ${options.hot.join(", ")}`
    );
  }

  if (options.themeAvoid?.length) {
    lines.push(
      `Also avoid indicators already used for this theme: ${options.themeAvoid.join(", ")}`
    );
  }

  return lines.join("\n");
}

export function multiWordIndicatorExamplesForPrompt(): string {
  return MULTI_WORD_ANAGRAM_INDICATORS.join("; ");
}

export function normalizeIndicatorKey(phrase: string): string {
  return phrase.toLowerCase().trim().replace(/\s+/g, " ");
}

/** True when the clue contains a fair anagram indicator (single- or multi-word). */
export function clueHasAnagramIndicator(clue: string): boolean {
  return extractIndicatorFromClue(clue) !== null;
}

/** Longest matching indicator phrase in the clue, if any. */
export function extractIndicatorFromClue(clue: string): string | null {
  const body = stripClueEnumeration(clue);

  const multiSorted = [...MULTI_WORD_ANAGRAM_INDICATORS].sort(
    (a, b) => b.length - a.length
  );
  for (const phrase of multiSorted) {
    if (new RegExp(escapeRegExp(phrase), "i").test(body)) {
      return phrase;
    }
  }

  const single = body.match(SINGLE_WORD_ANAGRAM_RE);
  if (single?.[1]) return single[1].toLowerCase();

  return null;
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffleWithSeed<T>(items: readonly T[], seed: string): T[] {
  const arr = [...items];
  let h = hashSeed(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick varied indicator phrases — single- and multi-word alternated, no length bias. */
export function pickIndicatorPhrases(options: {
  seed: string;
  avoid?: string[];
  count?: number;
  archiveCounts?: Map<string, number>;
}): IndicatorPhrase[] {
  const avoid = new Set((options.avoid ?? []).map(normalizeIndicatorKey));
  const count = options.count ?? 14;

  const multi = shuffleWithSeed(MULTI_WORD_ANAGRAM_INDICATORS, options.seed).filter(
    (p) => !avoid.has(normalizeIndicatorKey(p))
  );
  const single = shuffleWithSeed(ANAGRAM_INDICATORS, `${options.seed}-s`).filter(
    (w) => !avoid.has(w) && !OVERUSED_ANAGRAM_INDICATORS.has(w)
  );
  const fallback = shuffleWithSeed(
    [...ANAGRAM_INDICATORS, ...MULTI_WORD_ANAGRAM_INDICATORS],
    `${options.seed}-fb`
  ).filter((w) => !avoid.has(normalizeIndicatorKey(w)));

  const out: string[] = [];
  let mi = 0;
  let si = 0;
  const startWithMulti = hashSeed(options.seed) % 2 === 0;

  while (out.length < count && (mi < multi.length || si < single.length)) {
    const pickMulti =
      mi < multi.length &&
      si < single.length
        ? startWithMulti
          ? out.length % 2 === 0
          : out.length % 2 === 1
        : mi < multi.length;

    if (pickMulti) {
      out.push(multi[mi++]);
    } else if (si < single.length) {
      out.push(single[si++]);
    } else if (mi < multi.length) {
      out.push(multi[mi++]);
    } else {
      break;
    }
  }

  for (const phrase of fallback) {
    if (out.length >= count) break;
    const key = normalizeIndicatorKey(phrase);
    if (!out.some((p) => normalizeIndicatorKey(p) === key)) {
      out.push(phrase);
    }
  }

  const archiveCounts = options.archiveCounts;
  if (archiveCounts && archiveCounts.size > 0) {
    out.sort((a, b) => {
      const ca = archiveCounts.get(normalizeIndicatorKey(a)) ?? 0;
      const cb = archiveCounts.get(normalizeIndicatorKey(b)) ?? 0;
      return ca - cb;
    });
  }

  return out.slice(0, count);
}

/** @deprecated Use pickIndicatorPhrases — returns single-word subset only. */
export function pickIndicators(options: {
  seed: string;
  avoid?: string[];
  count?: number;
}): AnagramIndicator[] {
  return pickIndicatorPhrases(options).filter(
    (p): p is AnagramIndicator =>
      !p.includes(" ") && (ANAGRAM_INDICATORS as readonly string[]).includes(p)
  ) as AnagramIndicator[];
}

export function usedIndicatorsFromClues(
  clues: { clue: string; anagramIndicator?: string }[]
): string[] {
  const seen = new Set<string>();
  for (const item of clues) {
    const ind =
      item.anagramIndicator?.toLowerCase().trim() ??
      extractIndicatorFromClue(item.clue)?.toLowerCase();
    if (ind) seen.add(normalizeIndicatorKey(ind));
  }
  return [...seen];
}

export function isOverusedIndicator(phrase: string): boolean {
  const key = normalizeIndicatorKey(phrase);
  return OVERUSED_ANAGRAM_INDICATORS.has(key);
}

export function indicatorSurfaceScore(
  phrase: string,
  avoidIndicators: string[] = [],
  archiveCounts: Map<string, number> = new Map()
): number {
  let score = 10;
  const key = normalizeIndicatorKey(phrase);

  if (OVERUSED_ANAGRAM_INDICATORS.has(key)) score -= 35;
  if (avoidIndicators.map(normalizeIndicatorKey).includes(key)) score -= 45;

  const uses = archiveCounts.get(key) ?? 0;
  score -= uses * 8;
  if (uses === 0) score += 12;

  return score;
}
