import { extractIndicatorFromClue } from "./anagram-indicators";
import { fodderSpanInClue } from "./fodder-surface";

/** Function words that connect definition to wordplay — not part of the definition itself. */
export const LINKING_WORDS = new Set([
  "as",
  "for",
  "with",
  "where",
  "since",
  "from",
  "in",
  "on",
  "by",
  "of",
  "is",
  "may",
  "be",
  "once",
  "when",
  "oddly",
  "the",
  "a",
  "an",
  "this",
  "that",
  "appears",
  "seems",
  "looking",
  "like",
  "perhaps",
  "now",
]);

export const MAX_LINKING_WORDS = 3;
export const IDEAL_LINKING_WORDS = 1;
export function stripEnumerationForLinking(clue: string): string {
  return clue.replace(/\(\d+(?:,\s*\d+)*\)\s*$/, "").trim();
}

function tokenize(text: string): string[] {
  return text
    .replace(/[^a-zA-Z\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
}

function textBeforeFodder(clue: string, fodder: string): string {
  const body = stripEnumerationForLinking(clue);
  const lower = body.toLowerCase();
  const target = fodder.toLowerCase().trim();
  const idx = lower.indexOf(target);
  if (idx < 0) return body.trim();
  return body.slice(0, idx).trim();
}

function countTrailingLinkers(tokens: string[]): number {
  let count = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (LINKING_WORDS.has(tokens[i])) count++;
    else break;
  }
  return count;
}

function countLeadingLinkers(tokens: string[]): number {
  let count = 0;
  for (const token of tokens) {
    if (LINKING_WORDS.has(token)) count++;
    else break;
  }
  return count;
}

function stripIndicatorPrefix(tokens: string[], clueBody: string): string[] {
  const indicator = extractIndicatorFromClue(clueBody)?.toLowerCase().trim();
  if (!indicator) return tokens;

  const indicatorTokens = tokenize(indicator);
  if (
    indicatorTokens.length > 0 &&
    tokens.length >= indicatorTokens.length &&
    indicatorTokens.every((t, i) => tokens[i] === t)
  ) {
    return tokens.slice(indicatorTokens.length);
  }
  return tokens;
}

/** Count linker words between definition and wordplay (definition may be first or last). */
export function linkingWordCount(clue: string, fodder: string): number {
  const body = stripEnumerationForLinking(clue);
  const span = fodderSpanInClue(body, fodder);

  if (span) {
    const beforeTokens = tokenize(body.slice(0, span.start));
    let afterTokens = tokenize(body.slice(span.end));
    afterTokens = stripIndicatorPrefix(afterTokens, body);

    const linkersBefore = countTrailingLinkers(beforeTokens);
    const linkersAfter = countLeadingLinkers(afterTokens);

    const substantiveBefore = beforeTokens.filter((t) => !LINKING_WORDS.has(t))
      .length;
    const substantiveAfter = afterTokens.filter((t) => !LINKING_WORDS.has(t))
      .length;

    if (substantiveBefore >= substantiveAfter) return linkersBefore;
    return linkersAfter;
  }

  return countTrailingLinkers(tokenize(textBeforeFodder(clue, fodder)));
}
export function verifyLinkingWordCount(
  clue: string,
  fodder: string
): string | null {
  const count = linkingWordCount(clue, fodder);
  if (count <= MAX_LINKING_WORDS) return null;
  return `Too many linking words (${count}) between definition and wordplay — use at most ${MAX_LINKING_WORDS}; keep only what connects the two halves`;
}

export function linkingWordScore(clue: string, fodder: string): number {
  const count = linkingWordCount(clue, fodder);
  if (count === 0) return 8;
  if (count === 1) return 12;
  if (count === 2) return 4;
  if (count === 3) return -4;
  return -20;
}

/** Strip fodder + indicator from clue body to approximate the definition phrase. */
export function extractDefinitionPhrase(
  clue: string,
  fodder: string,
  indicator?: string
): string {
  const body = stripEnumerationForLinking(clue);
  const span = fodderSpanInClue(body, fodder);

  if (span) {
    const beforeTokens = tokenize(body.slice(0, span.start));
    let afterTokens = tokenize(body.slice(span.end));
    afterTokens = stripIndicatorPrefix(afterTokens, body);

    const substantiveBefore = beforeTokens.filter((t) => !LINKING_WORDS.has(t))
      .length;
    const substantiveAfter = afterTokens.filter((t) => !LINKING_WORDS.has(t))
      .length;

    if (substantiveBefore >= substantiveAfter) {
      while (
        beforeTokens.length > 0 &&
        LINKING_WORDS.has(beforeTokens[beforeTokens.length - 1])
      ) {
        beforeTokens.pop();
      }
      if (beforeTokens.length === 0) {
        return body.slice(0, span.start).replace(/[,—:;\s]+$/, "").trim();
      }
      return body.slice(0, span.start).replace(/[,—:;\s]+$/, "").trim();
    }

    while (afterTokens.length > 0 && LINKING_WORDS.has(afterTokens[0])) {
      afterTokens.shift();
    }
    if (afterTokens.length === 0) {
      return body.slice(span.end).replace(/^[,—:;\s]+/, "").trim();
    }
    const tail = body.slice(span.end).trim();
    return tail.replace(/^[,—:;\s]+/, "").split(/\s+/).slice(-afterTokens.length).join(" ");
  }

  let defBody = body;
  const fodderIdx = defBody.toLowerCase().indexOf(fodder.toLowerCase());
  if (fodderIdx >= 0) {
    defBody = defBody.slice(0, fodderIdx).trim();
  }

  const tokens = tokenize(defBody);
  while (tokens.length > 0 && LINKING_WORDS.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  if (tokens.length === 0) return defBody.replace(/[,—:;?.\s]+$/, "").trim();

  const original = stripEnumerationForLinking(clue);
  const lastToken = tokens[tokens.length - 1];
  const pos = original.toLowerCase().lastIndexOf(lastToken);
  if (pos >= 0) {
    return original.slice(0, pos + lastToken.length).replace(/[,—:;\s]+$/, "").trim();
  }

  return tokens.join(" ");
}

export function extractWordplayPhrase(
  clue: string,
  fodder: string,
  indicator?: string
): string {
  const body = stripEnumerationForLinking(clue);
  const ind =
    indicator?.toLowerCase().trim() ||
    extractIndicatorFromClue(body)?.toLowerCase();

  if (ind) {
    const escapedFodder = fodder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedInd = ind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${escapedFodder}[\\s\\S]*?${escapedInd}`, "i");
    const m = body.match(re);
    if (m) return m[0].trim();
  }

  return fodder;
}
