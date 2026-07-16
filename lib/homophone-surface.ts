import { answerEnumeration } from "./answer-format";
import type { HomophonePair } from "./homophone-dictionary";
import { definitionThemeScore } from "./definition-quality";
import { isGenericPartOfSpeechHint } from "./homophone-definitions";
import { shuffleWithSeed } from "./anagram-indicators";
import {
  isOverusedHomophoneIndicator,
  pickHomophoneIndicatorPhrases,
} from "./homophone-indicators";
import { blendSurfaceScore } from "./clue-surface-blend";
import { linkingWordScore, stripEnumerationForLinking } from "./clue-surface-link";
import {
  prepareHomophoneClue,
  verifyHomophoneClue,
} from "./homophone-engine";
import type { AnagramClueDraft } from "./types";

export interface HomophoneSurfaceBuildOptions {
  avoidIndicators?: string[];
  answerHints: string[];
  fodderHints: string[];
  shuffleSeed?: string;
  archiveCounts?: Map<string, number>;
}

type SurfacePattern = (
  answerHint: string,
  fodderHint: string,
  indicator: string,
  enumeration: string
) => string;

/**
 * Prefer mid-clue indicators with little/no punctuation.
 * Indicator must follow the fodder hint (verification requirement).
 * Best shape: [fodder hint] [indicator] [definition] (enumeration)
 */
const SURFACE_PATTERNS: SurfacePattern[] = [
  // Preferred: indicator mid-clue, minimal punctuation
  (a, f, i, e) => `${f} ${i} ${a} ${e}`,
  (a, f, i, e) => `${f} ${i} for ${a} ${e}`,
  (a, f, i, e) => `${f} ${i} means ${a} ${e}`,
  (a, f, i, e) => `${f} ${i} gives ${a} ${e}`,
  (a, f, i, e) => `${a} from ${f} ${i} ${e}`,
  (a, f, i, e) => `${a} as ${f} ${i} ${e}`,
  // Acceptable light punctuation
  (a, f, i, e) => `${f} ${i}, ${a} ${e}`,
  (a, f, i, e) => `${a} ${f} ${i} ${e}`,
  // Fallback patterns
  (a, f, i, e) => `${a}, ${f} ${i} ${e}`,
  (a, f, i, e) => `${a} when ${f} ${i} ${e}`,
  (a, f, i, e) => `${a} like ${f} ${i} ${e}`,
  (a, f, i, e) => `${a} with ${f} ${i} ${e}`,
];

function punctuationPenalty(clue: string): number {
  const body = stripEnumerationForLinking(clue);
  const commas = (body.match(/,/g) ?? []).length;
  const dashes = (body.match(/[—–-]/g) ?? []).length;
  const semis = (body.match(/;/g) ?? []).length;
  const colons = (body.match(/:/g) ?? []).length;
  return commas * 8 + dashes * 10 + semis * 12 + colons * 12;
}

/** Prefer indicator roughly in the middle third of the surface (not trailing). */
function indicatorMidClueBonus(
  clue: string,
  fodderHint: string,
  indicator: string
): number {
  const body = stripEnumerationForLinking(clue);
  const lower = body.toLowerCase();
  const hintIdx = lower.indexOf(fodderHint.toLowerCase());
  const indIdx = lower.indexOf(indicator.toLowerCase());
  if (hintIdx < 0 || indIdx < 0) return -20;

  const indEnd = indIdx + indicator.length;
  const afterIndicator = body.slice(indEnd).trim();
  // Trailing indicator (nothing but spaces after it before enumeration) — penalise
  if (!afterIndicator) return -28;

  const relative = indIdx / Math.max(body.length, 1);
  if (relative >= 0.2 && relative <= 0.65) return 18;
  if (relative < 0.2) return 6;
  return -10;
}

function scoreSurface(
  clue: string,
  answerHint: string,
  fodderHint: string,
  indicator: string,
  archiveCounts: Map<string, number>
): number {
  let score = linkingWordScore(clue, fodderHint);
  score += definitionThemeScore(answerHint);
  score += blendSurfaceScore(clue, fodderHint, indicator);
  score += indicatorMidClueBonus(clue, fodderHint, indicator);
  score -= punctuationPenalty(clue);

  if (isOverusedHomophoneIndicator(indicator)) score -= 40;
  const uses = archiveCounts.get(indicator.toLowerCase().trim()) ?? 0;
  score -= uses * 10;
  if (uses === 0) score += 8;

  if (/^Item\b|^Thing\b|^Offering\b|^Subject\b/.test(clue)) score -= 20;
  if (
    /^A valid crossword answer|^The solution sought|^What you must enter/i.test(
      answerHint
    ) ||
    /^A valid crossword answer|^The solution sought|^What you must enter/i.test(
      fodderHint
    )
  ) {
    return -1000;
  }
  if (/^A common /i.test(answerHint) || /^A common /i.test(fodderHint)) score -= 20;
  const answerWords = answerHint.split(/\s+/).filter(Boolean).length;
  const fodderWords = fodderHint.split(/\s+/).filter(Boolean).length;
  if (answerWords <= 2) score += 10;
  if (fodderWords <= 2) score += 8;
  if (answerWords === 1 && fodderWords === 1) score += 6;
  if (clue.length >= 20 && clue.length <= 75) score += 6;
  if (answerHint.toLowerCase() === fodderHint.toLowerCase()) score -= 40;
  return score;
}

function distinctHints(
  answerHints: string[],
  fodderHints: string[]
): Array<{ answerHint: string; fodderHint: string }> {
  const pairs: Array<{ answerHint: string; fodderHint: string }> = [];
  const seen = new Set<string>();

  for (const answerHint of answerHints) {
    for (const fodderHint of fodderHints) {
      if (answerHint.toLowerCase() === fodderHint.toLowerCase()) continue;
      const key = `${answerHint.toLowerCase()}|${fodderHint.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ answerHint, fodderHint });
    }
  }

  return pairs;
}

export function buildProgrammaticHomophoneClue(
  pair: HomophonePair,
  options: HomophoneSurfaceBuildOptions
): AnagramClueDraft | null {
  const enumeration = answerEnumeration(pair.answer);
  const avoidIndicators = (options.avoidIndicators ?? []).map((w) =>
    w.toLowerCase()
  );
  const archiveCounts = options.archiveCounts ?? new Map<string, number>();
  const seed = options.shuffleSeed ?? `${pair.answer}|${pair.fodder}|homophone`;

  const rejectPlaceholderHint = (hint: string): boolean =>
    /^A valid crossword answer|^The solution sought|^What you must enter/i.test(
      hint
    ) || isGenericPartOfSpeechHint(hint);

  const answerHints = shuffleWithSeed(options.answerHints, `${seed}-answer`)
    .filter((hint) => !rejectPlaceholderHint(hint))
    .slice(0, 8);
  const fodderHints = shuffleWithSeed(options.fodderHints, `${seed}-fodder`)
    .filter((hint) => !rejectPlaceholderHint(hint))
    .slice(0, 8);

  if (answerHints.length === 0 || fodderHints.length === 0) return null;
  const hintPairs = distinctHints(answerHints, fodderHints);
  // Prefer mid-indicator patterns first (listed first in SURFACE_PATTERNS)
  const patterns = [
    ...SURFACE_PATTERNS.slice(0, 6),
    ...shuffleWithSeed(SURFACE_PATTERNS.slice(6), `${seed}-patterns`).slice(0, 4),
  ];
  const indicators = pickHomophoneIndicatorPhrases({
    seed,
    avoid: avoidIndicators,
    maxItems: 14,
    archiveCounts,
  });

  let best: { draft: AnagramClueDraft; score: number } | null = null;

  for (const { answerHint, fodderHint } of hintPairs) {
    for (const pattern of patterns) {
      for (const indicator of indicators) {
        const clue = pattern(answerHint, fodderHint, indicator, enumeration);
        const draft: AnagramClueDraft = {
          answer: pair.answer,
          clue,
          anagramFodder: pair.fodder,
          anagramIndicator: indicator,
          definition: answerHint,
          homophoneHint: fodderHint,
        };
        const verification = verifyHomophoneClue(prepareHomophoneClue(draft));
        if (!verification.ok) continue;

        const surfaceScore = scoreSurface(
          verification.prepared.clue,
          answerHint,
          fodderHint,
          indicator,
          archiveCounts
        );
        if (!best || surfaceScore > best.score) {
          best = { draft: verification.prepared, score: surfaceScore };
        }
      }
    }
  }

  return best?.draft ?? null;
}
