import { CONTRACTION_PAIRS } from "./fodder-contractions";

function stripEnumeration(clue: string): string {
  return clue.replace(/\(\d+(?:,\s*\d+)*\)\s*$/, "").trim();
}

/** Grammatical punctuation only between fodder words — not decorative brackets/quotes on fodder. */
const FODDER_GAP_PATTERN = /^[\s,.;:—–\-?!'""]*$/;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function fodderTokens(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

interface WordOccurrence {
  text: string;
  start: number;
  end: number;
  used: boolean;
}

function clueWordMatchesToken(clueWord: string, token: string): boolean {
  const lower = clueWord.toLowerCase();
  const normalized = lower.replace(/'/g, "");
  if (normalized === token) return true;

  for (const [first, second, surface] of CONTRACTION_PAIRS) {
    if (first !== token) continue;
    if (lower === surface.toLowerCase()) return true;
    if (normalized === first + second) return true;
  }

  return false;
}

function clueWordOccurrences(body: string): WordOccurrence[] {
  const words: WordOccurrence[] = [];
  const re = /\b[a-zA-Z']+\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    words.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
      used: false,
    });
  }
  return words;
}

export function assignFodderPositions(
  body: string,
  tokens: string[]
): { start: number; end: number }[] | null {
  if (tokens.length === 0) return null;

  const words = clueWordOccurrences(body);
  const positions: { start: number; end: number }[] = [];

  for (const token of tokens) {
    const idx = words.findIndex(
      (w) => !w.used && clueWordMatchesToken(w.text, token)
    );
    if (idx < 0) return null;
    words[idx].used = true;
    positions.push({ start: words[idx].start, end: words[idx].end });
  }

  positions.sort((a, b) => a.start - b.start);

  for (let i = 0; i < positions.length - 1; i++) {
    const gap = body.slice(positions[i].end, positions[i + 1].start);
    if (!FODDER_GAP_PATTERN.test(gap)) return null;
  }

  return positions;
}

/** All fodder words appear in the clue; any order; only punctuation between them. */
export function phraseAppearsAsFodderWords(clue: string, phrase: string): boolean {
  const body = stripEnumeration(clue);
  const tokens = fodderTokens(phrase);
  if (tokens.length === 0) return false;
  return assignFodderPositions(body, tokens) !== null;
}

export function fodderSpanInClue(
  clue: string,
  phrase: string
): { start: number; end: number } | null {
  const body = stripEnumeration(clue);
  const tokens = fodderTokens(phrase);
  const positions = assignFodderPositions(body, tokens);
  if (!positions?.length) return null;
  return {
    start: positions[0].start,
    end: positions[positions.length - 1].end,
  };
}
