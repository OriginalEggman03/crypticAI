import { answerEnumeration } from "./answer-format";
import { prepareAnagramClue, verifyAnagramClue } from "./anagram-engine";
import type { AnagramPair } from "./anagram-dictionary";
import {
  definitionThemeScore,
  themeDefinitionSeeds,
} from "./definition-quality";
import {
  indicatorSurfaceScore,
  isOverusedIndicator,
  pickIndicatorPhrases,
  shuffleWithSeed,
} from "./anagram-indicators";
import { blendSurfaceScore } from "./clue-surface-blend";
import {
  MAX_LINKING_WORDS,
  extractDefinitionPhrase,
  linkingWordScore,
} from "./clue-surface-link";
import { formatFodderForClue } from "./proper-noun-casing";
import type { AnagramClueDraft } from "./types";

export interface SurfaceBuildOptions {
  avoidIndicators?: string[];
  suggestedAnswers?: string[];
  archiveCounts?: Map<string, number>;
  minThemeScore?: number;
  /** Claude-cached definition phrases for this inspiration. */
  claudeDefinitionSeeds?: string[];
}

type SurfacePattern = (
  definition: string,
  fodder: string,
  indicator: string,
  enumeration: string
) => string;

/** Blended surfaces — linking words at the seam, not colons or commas. */
const SURFACE_PATTERNS: SurfacePattern[] = [
  (d, f, i, e) => `${d} where ${f} ${i} ${e}`,
  (d, f, i, e) => `Perhaps ${d} if ${f} ${i} ${e}`,
  (d, f, i, e) => `${f} ${i} for ${d} ${e}`,
  (d, f, i, e) => `${f} ${i} may mean ${d} ${e}`,
  (d, f, i, e) => `${f} ${i} could be ${d} ${e}`,
  (d, f, i, e) => `(Could it be ${d}? ${f} ${i}) ${e}`,
  (d, f, i, e) => `Is ${d} what ${f} ${i} suggests ${e}`,
  (d, f, i, e) => `On reflection ${d} when ${f} ${i} ${e}`,
  (d, f, i, e) => `${d} as ${f} ${i} ${e}`,
  (d, f, i, e) => `${f} ${i} and so ${d} ${e}`,
  (d, f, i, e) => `*Perhaps* ${d} after ${f} ${i} ${e}`,
];

function fodderSurfaceVariants(fodder: string): string[] {
  const words = fodder.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [fodder];

  return [fodder, [...words].reverse().join(" ")];
}

function definitionPhrases(
  inspiration: string,
  answer: string,
  claudeSeeds: string[] = []
): string[] {
  return themeDefinitionSeeds(inspiration, answer, claudeSeeds);
}

function scoreSurface(
  clue: string,
  fodder: string,
  indicator: string,
  avoidIndicators: string[],
  archiveCounts: Map<string, number>
): number {
  let score = linkingWordScore(clue, fodder);
  score += indicatorSurfaceScore(indicator, avoidIndicators, archiveCounts);
  score += definitionThemeScore(
    extractDefinitionPhrase(clue, fodder, indicator)
  );
  score += blendSurfaceScore(clue, fodder, indicator);
  if (/^Item\b|^Thing\b|^Offering\b|^Subject\b/.test(clue)) score -= 20;
  if (clue.length >= 25 && clue.length <= 75) score += 6;
  return score;
}

export function buildProgrammaticClue(
  pair: AnagramPair,
  inspiration: string,
  options: SurfaceBuildOptions = {}
): AnagramClueDraft | null {
  const enumeration = answerEnumeration(pair.answer);
  const avoidIndicators = (options.avoidIndicators ?? []).map((w) =>
    w.toLowerCase()
  );
  const archiveCounts = options.archiveCounts ?? new Map();
  const seed = `${pair.answer}|${pair.fodder}|${inspiration}`;

  const definitions = shuffleWithSeed(
    definitionPhrases(inspiration, pair.answer, options.claudeDefinitionSeeds),
    `${seed}-defs`
  ).slice(0, 8);
  const patterns = shuffleWithSeed(SURFACE_PATTERNS, `${seed}-patterns`).slice(
    0,
    8
  );
  const indicators = pickIndicatorPhrases({
    seed,
    avoid: avoidIndicators,
    archiveCounts,
  }).slice(0, 14);

  let best: { draft: AnagramClueDraft; score: number } | null = null;

  for (const definition of definitions) {
    for (const pattern of patterns) {
      for (const indicator of indicators) {
        for (const surfaceFodder of fodderSurfaceVariants(pair.fodder)) {
          const displayFodder = formatFodderForClue(surfaceFodder);
          const clue = pattern(
            definition,
            displayFodder,
            indicator,
            enumeration
          );
          const draft: AnagramClueDraft = {
            answer: pair.answer,
            clue,
            anagramFodder: formatFodderForClue(pair.fodder),
            anagramIndicator: indicator,
          };
          const verification = verifyAnagramClue(prepareAnagramClue(draft), {
            inspiration,
            suggestedAnswers: options.suggestedAnswers,
            minThemeScore: options.minThemeScore,
          });
          if (!verification.ok) continue;

          const surfaceScore = scoreSurface(
            verification.prepared.clue,
            pair.fodder,
            indicator,
            avoidIndicators,
            archiveCounts
          );
          if (!best || surfaceScore > best.score) {
            best = { draft: verification.prepared, score: surfaceScore };
          }
        }
      }
    }
  }

  return best?.draft ?? buildFallbackClue(pair, inspiration, options);
}

function buildFallbackClue(
  pair: AnagramPair,
  inspiration: string,
  options: SurfaceBuildOptions
): AnagramClueDraft | null {
  const displayFodder = formatFodderForClue(pair.fodder);
  const enumeration = answerEnumeration(pair.answer);
  const indicators = pickIndicatorPhrases({
    seed: `${pair.answer}|${pair.fodder}|fallback`,
    avoid: (options.avoidIndicators ?? []).map((w) => w.toLowerCase()),
    archiveCounts: options.archiveCounts,
  });
  const indicator =
    indicators.find((p) => !isOverusedIndicator(p)) ?? indicators[0] ?? "in chaos";
  const definitions = themeDefinitionSeeds(
    inspiration,
    pair.answer,
    options.claudeDefinitionSeeds
  );
  const definition =
    definitions[0] ?? "A thematic answer";
  const draft = prepareAnagramClue({
    answer: pair.answer,
    clue: `${definition} where ${displayFodder} ${indicator} ${enumeration}`,
    anagramFodder: displayFodder,
    anagramIndicator: indicator,
  });
  const verification = verifyAnagramClue(draft, {
    inspiration,
    suggestedAnswers: options.suggestedAnswers,
    minThemeScore: options.minThemeScore,
  });
  return verification.ok ? verification.prepared : null;
}

export { MAX_LINKING_WORDS };
