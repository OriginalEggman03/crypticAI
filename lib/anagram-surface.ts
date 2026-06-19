import { answerEnumeration } from "./answer-format";
import { prepareAnagramClue, verifyAnagramClue } from "./anagram-engine";
import type { AnagramPair } from "./anagram-dictionary";
import {
  indicatorSurfaceScore,
  isOverusedIndicator,
  pickIndicatorPhrases,
  shuffleWithSeed,
} from "./anagram-indicators";
import {
  MAX_LINKING_WORDS,
  linkingWordScore,
} from "./clue-surface-link";
import { formatFodderForClue } from "./proper-noun-casing";
import { phraseUsesHiddenInspirationWord } from "./inspiration-parse";
import type { AnagramClueDraft } from "./types";

export interface SurfaceBuildOptions {
  avoidIndicators?: string[];
  suggestedAnswers?: string[];
  archiveCounts?: Map<string, number>;
}

type SurfacePattern = (
  definition: string,
  fodder: string,
  indicator: string,
  enumeration: string
) => string;

/** Definition first or last; minimal linking. */
const SURFACE_PATTERNS: SurfacePattern[] = [
  (d, f, i, e) => `${d}: ${f} ${i} ${e}`,
  (d, f, i, e) => `${d} — ${f} ${i} ${e}`,
  (d, f, i, e) => `${d}, ${f} ${i} ${e}`,
  (d, f, i, e) => `${d}; ${f} ${i} ${e}`,
  (d, f, i, e) => `${f} ${i} — ${d} ${e}`,
  (d, f, i, e) => `${f}, ${i}: ${d} ${e}`,
  (d, f, i, e) => `${f}; ${i} — ${d} ${e}`,
  (d, f, i, e) => `${f} ${i}, ${d} ${e}`,
  (d, f, i, e) => `(Could it be ${d}? ${f} ${i}) ${e}`,
  (d, f, i, e) => `"${d}," they said — ${f} ${i} ${e}`,
  (d, f, i, e) => `*Perhaps* ${d}: ${f} ${i} ${e}`,
  (d, f, i, e) => `(On reflection, ${d} — ${f} ${i}) ${e}`,
];

function fodderSurfaceVariants(fodder: string): string[] {
  const words = fodder.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [fodder];

  const variants = new Set<string>([fodder, [...words].reverse().join(" ")]);

  if (words.length === 2) {
    const [a, b] = words;
    variants.add(`${a}, ${b}`);
    variants.add(`${a}; ${b}`);
    variants.add(`${a}. ${b}`);
    variants.add(`${a}? ${b}`);
    variants.add(`${a}! ${b}`);
    variants.add(`${a} — ${b}`);
  } else {
    variants.add(words.join(", "));
    variants.add(`${words[0]}; ${words.slice(1).join(", ")}`);
    variants.add(`${words[0]}. ${words.slice(1).join(" ")}`);
    variants.add(`${words.slice(0, -1).join(", ")}; ${words[words.length - 1]}`);
  }

  return [...variants];
}

const GENERIC_DEFINITIONS = [
  "A familiar name",
  "A notable figure",
  "One possibility",
  "A well-known name",
  "A pop-culture name",
];

function categoryDefinitions(inspiration: string): string[] {
  const lower = inspiration.toLowerCase();
  const defs: string[] = [];

  if (/\bcharacter|\bhero|\bvillain|\bname/i.test(lower)) {
    defs.push(
      "A familiar face",
      "A named figure",
      "A roster member",
      "A fighter perhaps"
    );
  }
  if (/\bgame|\bseries|\bfranchise/i.test(lower)) {
    defs.push("A digital icon", "A series regular", "One from the roster");
  }
  if (/\bfilm|\bmovie|\bbook|\bsong/i.test(lower)) {
    defs.push("A notable name", "One from the canon");
  }
  if (/\bfood|\bdrink|\bcoffee|\bwine/i.test(lower)) {
    defs.push("Something on the menu", "A tasty option");
  }

  return defs.filter((d) => !phraseUsesHiddenInspirationWord(d, inspiration));
}

function definitionPhrases(inspiration: string, answer: string): string[] {
  const answerLower = answer.toLowerCase().replace(/\s+/g, " ");
  const phrases = [...categoryDefinitions(inspiration), ...GENERIC_DEFINITIONS];
  const seen = new Set<string>();

  return phrases.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    if (key.includes(answerLower)) return false;
    if (phraseUsesHiddenInspirationWord(p, inspiration)) return false;
    seen.add(key);
    return true;
  });
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
    definitionPhrases(inspiration, pair.answer),
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
  const draft = prepareAnagramClue({
    answer: pair.answer,
    clue: `A familiar name: ${displayFodder} ${indicator} ${enumeration}`,
    anagramFodder: displayFodder,
    anagramIndicator: indicator,
  });
  const verification = verifyAnagramClue(draft, {
    inspiration,
    suggestedAnswers: options.suggestedAnswers,
  });
  return verification.ok ? verification.prepared : null;
}

export { MAX_LINKING_WORDS };
