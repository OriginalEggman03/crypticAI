import { extractIndicatorFromClue } from "./anagram-indicators";
import { fodderSpanInClue } from "./fodder-surface";
import { stripEnumerationForLinking } from "./clue-surface-link";

/** Punctuation that marks a definition/wordplay seam when adjacent to fodder. */
const BOUNDARY_PUNCT_AT_EDGE = /[,;:—–-]$/;
const BOUNDARY_PUNCT_AFTER_WORDPLAY = /^[,;:—–-]/;

export const SURFACE_BLEND_RULE = `Weave definition and wordplay into one flowing sentence. Do NOT put a comma, colon, semi-colon, or dash immediately before the fodder cluster or immediately after the wordplay half — that telegraphs the break (weak: "An arcade combatant, John agency in chaos"; stronger: "Perhaps John agency in chaos for an arcade combatant"). Question marks and exclamation marks are fine when the whole clue is phrased as a question or outburst. Commas between fodder words are allowed when they help grammar (e.g. "That'd army, in chaos").`;

export interface BoundaryTelegraphResult {
  telegraphs: boolean;
  reason: string | null;
  beforeFodder: string;
  afterWordplay: string;
}

/**
 * Detect punctuation at the definition/wordplay boundary only —
 * not commas between fodder words inside the wordplay half.
 */
export function detectBoundaryTelegraph(
  clue: string,
  fodder: string,
  indicator?: string
): BoundaryTelegraphResult {
  const body = stripEnumerationForLinking(clue);
  const span = fodderSpanInClue(body, fodder);
  if (!span) {
    return { telegraphs: false, reason: null, beforeFodder: "", afterWordplay: "" };
  }

  const beforeTrim = body.slice(0, span.start).replace(/\s+$/, "");
  const beforeFodder = beforeTrim;

  if (BOUNDARY_PUNCT_AT_EDGE.test(beforeTrim)) {
    return {
      telegraphs: true,
      reason: `Comma, colon, or dash before wordplay telegraphs the break — blend with a linking word instead`,
      beforeFodder,
      afterWordplay: "",
    };
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

  if (tail.length > 0 && BOUNDARY_PUNCT_AFTER_WORDPLAY.test(tail)) {
    return {
      telegraphs: true,
      reason: `Comma, colon, or dash after wordplay telegraphs the definition — weave both halves into one sentence`,
      beforeFodder,
      afterWordplay: tail,
    };
  }

  return { telegraphs: false, reason: null, beforeFodder, afterWordplay: tail };
}

/** Soft score nudge — not a hard verification gate. */
export function blendSurfaceScore(
  clue: string,
  fodder: string,
  indicator?: string
): number {
  const body = stripEnumerationForLinking(clue);
  const telegraph = detectBoundaryTelegraph(clue, fodder, indicator);
  if (telegraph.telegraphs) return -18;

  let score = 0;
  if (/[?!]/.test(body)) score += 3;
  if (/^(could it be|perhaps|on reflection|lost at sea)/i.test(body.trim())) {
    score += 4;
  }
  if (/\b(where|if|when|for|may mean|could be)\b/i.test(body)) score += 2;
  return score;
}
