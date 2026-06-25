import { extractIndicatorFromClue } from "./anagram-indicators";
import {
  LINKING_WORDS,
  stripEnumerationForLinking,
} from "./clue-surface-link";
import { assignFodderPositions, fodderTokens } from "./fodder-surface";

type WordOcc = { text: string; start: number; end: number; lower: string };

function listWordOccurrences(body: string): WordOcc[] {
  const occs: WordOcc[] = [];
  const re = /\b[a-zA-Z']+\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    occs.push({
      text: m[0],
      start: m.index,
      end: m.index + m[0].length,
      lower: m[0].toLowerCase(),
    });
  }
  return occs;
}

function fodderOccIndices(body: string, fodder: string): Set<number> {
  const tokens = fodderTokens(fodder);
  const positions = assignFodderPositions(body, tokens);
  if (!positions?.length) return new Set();

  const occs = listWordOccurrences(body);
  const marked = new Set<number>();
  for (let i = 0; i < occs.length; i++) {
    for (const p of positions) {
      if (occs[i].start === p.start) marked.add(i);
    }
  }
  return marked;
}

function indicatorSpan(
  body: string,
  indicator: string,
  fodderSpan: { start: number; end: number }
): { start: number; end: number } | null {
  const phrase = indicator.trim();
  if (!phrase) return null;

  const lower = body.toLowerCase();
  const indLower = phrase.toLowerCase();
  let idx = lower.indexOf(indLower);
  if (idx >= 0) {
    return { start: idx, end: idx + phrase.length };
  }

  const indToks = phrase.toLowerCase().split(/\s+/).filter(Boolean);
  if (indToks.length === 0) return null;

  const occs = listWordOccurrences(body);
  for (let i = 0; i <= occs.length - indToks.length; i++) {
    let matches = true;
    for (let j = 0; j < indToks.length; j++) {
      if (occs[i + j].lower !== indToks[j]) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;
    const start = occs[i].start;
    const end = occs[i + indToks.length - 1].end;
    const nearFodder =
      start >= fodderSpan.start - 40 &&
      end <= fodderSpan.end + 40;
    if (nearFodder) return { start, end };
  }
  return null;
}

function indicatorOccIndices(
  body: string,
  indicator: string,
  fodderSpan: { start: number; end: number }
): Set<number> {
  const phrase = indicator.trim();
  if (!phrase) return new Set();

  const span = indicatorSpan(body, phrase, fodderSpan);
  const occs = listWordOccurrences(body);
  const marked = new Set<number>();

  if (span) {
    for (let i = 0; i < occs.length; i++) {
      if (occs[i].start >= span.start && occs[i].end <= span.end) {
        marked.add(i);
      }
    }
    return marked;
  }

  const indToks = phrase.toLowerCase().split(/\s+/).filter(Boolean);
  for (let i = 0; i <= occs.length - indToks.length; i++) {
    let matches = true;
    for (let j = 0; j < indToks.length; j++) {
      if (occs[i + j].lower !== indToks[j]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      for (let j = 0; j < indToks.length; j++) marked.add(i + j);
      return marked;
    }
  }
  return marked;
}

function trailingLinkerCount(occs: WordOcc[], endExclusive: number): number {
  const before = occs.filter((o) => o.end <= endExclusive);
  let count = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    if (LINKING_WORDS.has(before[i].lower)) count++;
    else break;
  }
  return count;
}

function leadingLinkerCount(occs: WordOcc[], startInclusive: number): number {
  const after = occs.filter((o) => o.start >= startInclusive);
  let count = 0;
  for (let i = 0; i < after.length; i++) {
    if (LINKING_WORDS.has(after[i].lower)) count++;
    else break;
  }
  return count;
}

/** True when substantive content follows wordplay — definition is at the end. */
function definitionFollowsWordplay(
  body: string,
  fodderSpan: { start: number; end: number },
  indicatorPhrase: string
): boolean {
  let afterText = body.slice(fodderSpan.end);
  if (indicatorPhrase) {
    const idx = afterText.toLowerCase().indexOf(indicatorPhrase.toLowerCase());
    if (idx >= 0) {
      afterText = afterText.slice(idx + indicatorPhrase.length);
    }
  }
  return tokenize(afterText).some((token) => !LINKING_WORDS.has(token));
}

function tokenize(text: string): string[] {
  return text
    .replace(/[^a-zA-Z\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
}

/**
 * When the definition sits after wordplay, only linking words may appear
 * before the fodder — no decorative openers like "Lost at sea? Help me".
 */
export function verifyNoStrayPadding(
  clue: string,
  fodder: string,
  indicator?: string
): string | null {
  const body = stripEnumerationForLinking(clue);
  const fodderTokList = fodderTokens(fodder);
  if (fodderTokList.length === 0) return null;

  const positions = assignFodderPositions(body, fodderTokList);
  if (!positions?.length) return null;

  const fodderSpan = {
    start: positions[0].start,
    end: positions[positions.length - 1].end,
  };
  const indicatorPhrase =
    indicator?.trim() || extractIndicatorFromClue(body) || "";

  if (!definitionFollowsWordplay(body, fodderSpan, indicatorPhrase)) {
    return null;
  }

  const occs = listWordOccurrences(body);
  const fodderUsed = fodderOccIndices(body, fodder);
  const indicatorUsed = indicatorOccIndices(body, indicatorPhrase, fodderSpan);

  for (let i = 0; i < occs.length; i++) {
    if (occs[i].end > fodderSpan.start) continue;
    if (fodderUsed.has(i) || indicatorUsed.has(i)) continue;
    if (LINKING_WORDS.has(occs[i].lower)) continue;
    return `Stray padding "${occs[i].text}" before wordplay — when the definition follows, only brief linking words may precede the fodder`;
  }

  return null;
}

/** Reject filler words wedged into wordplay or stray linkers inside the definition. */
export function verifyNoSuperfluousWords(
  clue: string,
  fodder: string,
  indicator?: string
): string | null {
  const paddingErr = verifyNoStrayPadding(clue, fodder, indicator);
  if (paddingErr) return paddingErr;

  const body = stripEnumerationForLinking(clue);
  const fodderTokList = fodderTokens(fodder);
  if (fodderTokList.length === 0) return null;

  const positions = assignFodderPositions(body, fodderTokList);
  if (!positions?.length) return null;

  const fodderSpan = {
    start: positions[0].start,
    end: positions[positions.length - 1].end,
  };

  const indicatorPhrase =
    indicator?.trim() || extractIndicatorFromClue(body) || "";
  const occs = listWordOccurrences(body);
  const fodderUsed = fodderOccIndices(body, fodder);
  const indicatorUsed = indicatorOccIndices(body, indicatorPhrase, fodderSpan);

  const indSpan = indicatorPhrase
    ? indicatorSpan(body, indicatorPhrase, fodderSpan)
    : null;

  const wordplayStart = Math.min(
    fodderSpan.start,
    indSpan?.start ?? fodderSpan.start
  );
  const wordplayEnd = Math.max(
    fodderSpan.end,
    indSpan?.end ?? fodderSpan.end
  );

  for (let i = 0; i < occs.length; i++) {
    if (fodderUsed.has(i) || indicatorUsed.has(i)) continue;
    const o = occs[i];
    if (o.start >= wordplayStart && o.end <= wordplayEnd) {
      return `Superfluous word "${o.text}" in wordplay — only fodder and indicator may appear there`;
    }
  }

  const trailBeforeFodder = trailingLinkerCount(occs, fodderSpan.start);
  for (let i = 0; i < occs.length; i++) {
    if (occs[i].end > fodderSpan.start) continue;
    if (!LINKING_WORDS.has(occs[i].lower)) continue;
    if (fodderUsed.has(i) || indicatorUsed.has(i)) continue;

    const linkersBefore = occs
      .filter((o) => o.end <= fodderSpan.start && LINKING_WORDS.has(o.lower))
      .map((o) => o.start);
    const rank = linkersBefore.indexOf(occs[i].start);
    const trailingStart = linkersBefore.length - trailBeforeFodder;
    if (rank >= 0 && rank < trailingStart) {
      return `Superfluous linking word "${occs[i].text}" in the definition`;
    }
  }

  const leadAfterWordplay = leadingLinkerCount(occs, wordplayEnd);
  for (let i = 0; i < occs.length; i++) {
    if (occs[i].start < wordplayEnd) continue;
    if (!LINKING_WORDS.has(occs[i].lower)) continue;
    if (fodderUsed.has(i) || indicatorUsed.has(i)) continue;

    const linkersAfter = occs
      .filter((o) => o.start >= wordplayEnd && LINKING_WORDS.has(o.lower))
      .map((o) => o.start);
    const rank = linkersAfter.indexOf(occs[i].start);
    if (rank >= 0 && rank >= leadAfterWordplay) {
      return `Superfluous linking word "${occs[i].text}" after wordplay`;
    }
  }

  return null;
}
