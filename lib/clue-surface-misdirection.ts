import { extractIndicatorFromClue } from "./anagram-indicators";
import {
  assignFodderPositions,
  fodderSpanInClue,
  fodderTokens,
} from "./fodder-surface";
import { stripEnumerationForLinking } from "./clue-surface-link";

const BOUNDARY_PUNCT = /[,;:—–-]$/;
const FODDER_GAP_PUNCT = /[,;.—–!?]/;
const AFTER_WORDPLAY_PUNCT = /^[,;:—–-]/;

/** Penalise punctuation that marks definition/wordplay boundaries (higher = better surface). */
export function misdirectionSurfaceScore(
  clue: string,
  fodder: string,
  indicator?: string
): number {
  const err = verifyNoTelegraphingPunctuation(clue, fodder, indicator);
  if (err) return -24;

  const body = stripEnumerationForLinking(clue);
  let score = 0;

  if (/[?!]/.test(body) && !BOUNDARY_PUNCT.test(body.replace(/\([^)]*\)$/, ""))) {
    score += 4;
  }
  if (/^["'(]/.test(body.trim()) || /["')]\s*$/.test(body.trim())) {
    score += 3;
  }
  if (!/[,;:—–-]\s*\S+\s+in\s+(chaos|disarray|a mess)/i.test(body)) {
    score += 2;
  }

  return score;
}

/** Reject clues where commas/colons/dashes sit at section boundaries instead of misdirecting. */
export function verifyNoTelegraphingPunctuation(
  clue: string,
  fodder: string,
  indicator?: string
): string | null {
  const body = stripEnumerationForLinking(clue);
  const span = fodderSpanInClue(body, fodder);
  if (!span) return null;

  const beforeTrim = body.slice(0, span.start).replace(/\s+$/, "");
  if (BOUNDARY_PUNCT.test(beforeTrim)) {
    return `Punctuation before wordplay telegraphs the break — weave fodder into the sentence instead of separating with a comma, colon, or dash`;
  }

  const tokens = fodderTokens(fodder);
  const positions = assignFodderPositions(body, tokens);
  if (positions) {
    for (let i = 0; i < positions.length - 1; i++) {
      const gap = body.slice(positions[i].end, positions[i + 1].start);
      if (FODDER_GAP_PUNCT.test(gap)) {
        return `Punctuation between fodder words telegraphs wordplay — use spaces only between fodder words in the surface`;
      }
    }
  }

  const indicatorPhrase =
    indicator?.trim() || extractIndicatorFromClue(body) || "";
  let tail = body.slice(span.end).trim();
  if (indicatorPhrase) {
    const idx = tail.toLowerCase().indexOf(indicatorPhrase.toLowerCase());
    if (idx >= 0) {
      tail = tail.slice(idx + indicatorPhrase.length).trim();
    }
  }
  if (tail.length > 0 && AFTER_WORDPLAY_PUNCT.test(tail)) {
    return `Punctuation after wordplay telegraphs the definition — blend both halves into one flowing sentence`;
  }

  return null;
}
