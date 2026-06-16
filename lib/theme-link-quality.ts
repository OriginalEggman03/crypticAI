import { answerWords, normalizeAnswer } from "./answer-format";
import {
  CATEGORY_DESCRIPTORS,
  parseInspiration,
  type ParsedInspiration,
} from "./inspiration-parse";
import { scoreAnswerRelevance } from "./theme-scoring";

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function sharedPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * True when a word is an orthographic neighbour of a title/frame word
 * (e.g. BADMAN ≈ BATMAN) without being a genuine themed entity.
 */
export function isSpellingLookalikeOfFrame(
  word: string,
  parsed: ParsedInspiration
): boolean {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length < 4) return false;

  for (const frame of parsed.frameWords) {
    if (CATEGORY_DESCRIPTORS.has(frame)) continue;
    if (w === frame) continue;

    const dist = levenshtein(w, frame);
    const lenDiff = Math.abs(w.length - frame.length);

    if (lenDiff <= 1 && dist === 1) return true;
    if (w.length === frame.length && dist === 2 && sharedPrefixLength(w, frame) >= 3) {
      return true;
    }
  }

  return false;
}

export function isWeakThematicAnswer(
  answer: string,
  parsed: ParsedInspiration
): boolean {
  return answerWords(normalizeAnswer(answer)).some((token) =>
    isSpellingLookalikeOfFrame(token, parsed)
  );
}

/** Answers need a strong link — suggested, named entity, or high semantic score. */
export function meetsThematicBar(
  answer: string,
  parsed: ParsedInspiration,
  score: number,
  suggested?: Set<string>,
  minScore = 350
): boolean {
  const normalized = normalizeAnswer(answer);
  if (isWeakThematicAnswer(normalized, parsed)) return false;
  if (suggested?.has(normalized)) return true;
  if (parsed.entityCandidates.some((e) => e === normalized.toLowerCase())) {
    return true;
  }
  return score >= minScore;
}

export interface ThemeLinkVerifyOptions {
  suggestedAnswers?: string[];
  minScore?: number;
}

/** Hard gate: answer must tie to the inspiration, not just pass letter-math. */
export function verifyAnswerThematicLink(
  answer: string,
  inspiration: string,
  options: ThemeLinkVerifyOptions = {}
): string | null {
  if (!inspiration.trim()) return null;

  const parsed = parseInspiration(inspiration);
  const normalized = normalizeAnswer(answer);
  if (!normalized) {
    return "Answer is missing or empty";
  }

  const suggested = options.suggestedAnswers?.length
    ? new Set(options.suggestedAnswers.map(normalizeAnswer))
    : undefined;
  const minScore = options.minScore ?? 350;

  if (isWeakThematicAnswer(normalized, parsed)) {
    return `Answer "${normalized}" resembles the theme title in spelling only — pick a genuine entity from the inspiration`;
  }

  const score = scoreAnswerRelevance(normalized, parsed, suggested);
  if (meetsThematicBar(normalized, parsed, score, suggested, minScore)) {
    return null;
  }

  return `Answer "${normalized}" is not linked to the inspiration — choose a named entity or concept from the theme`;
}
