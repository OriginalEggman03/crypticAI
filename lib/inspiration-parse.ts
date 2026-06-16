import { answerLengthInBounds, type AnswerLengthBounds } from "./anagram-difficulty";
import {
  answerLetters,
  MAX_ANSWER_WORDS,
  MIN_ANSWER_WORD_LEN,
  normalizeAnswer,
} from "./answer-format";
import { trieHasWord } from "./anagram-trie";

/** Words that describe the topic frame, not crossword answers. */
export const CATEGORY_DESCRIPTORS = new Set([
  "character",
  "characters",
  "name",
  "names",
  "villain",
  "villains",
  "hero",
  "heroes",
  "item",
  "items",
  "thing",
  "things",
  "topic",
  "topics",
  "theme",
  "themes",
  "song",
  "songs",
  "film",
  "films",
  "movie",
  "movies",
  "book",
  "books",
  "game",
  "games",
  "food",
  "foods",
  "place",
  "places",
  "animal",
  "animals",
  "brand",
  "brands",
  "style",
  "styles",
  "type",
  "types",
]);

const STOP_TOKENS = new Set([
  "the",
  "and",
  "for",
  "from",
  "with",
  "about",
  "etc",
  "like",
  "such",
  "other",
  "some",
  "many",
  "various",
]);

export interface ParsedInspiration {
  /** User-named specifics — single or multi-word (johnny cage, scorpion…). */
  entityCandidates: string[];
  /** Topic framing words to avoid as answers (mortal, kombat, characters…). */
  frameWords: Set<string>;
  /** All content tokens from the inspiration. */
  themeTokens: Set<string>;
}

function normalizeToken(raw: string): string | null {
  const w = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length < 3 || STOP_TOKENS.has(w)) return null;
  return w;
}

function tokensFromText(text: string): string[] {
  return (text.match(/[a-zA-Z]{3,}/g) ?? [])
    .map(normalizeToken)
    .filter((w): w is string => w !== null);
}

function contentParts(segment: string): string[] {
  return segment
    .trim()
    .split(/\s+/)
    .map((p) => p.toLowerCase().replace(/[^a-z]/g, ""))
    .filter((p) => p.length >= 3 && !STOP_TOKENS.has(p));
}

function phraseWindows(parts: string[], frameWords: Set<string>): string[] {
  const entities: string[] = [];
  const usable = parts.filter(
    (p) =>
      !frameWords.has(p) &&
      !CATEGORY_DESCRIPTORS.has(p) &&
      p.length >= MIN_ANSWER_WORD_LEN
  );

  for (let i = 0; i < usable.length - 1; i++) {
    const pair = `${usable[i]} ${usable[i + 1]}`;
    const letters = usable[i].length + usable[i + 1].length;
    if (letters >= 4 && letters <= 12) entities.push(pair);
  }

  if (
    usable.length >= 2 &&
    usable.length <= MAX_ANSWER_WORDS
  ) {
    const full = usable.join(" ");
    const letters = usable.join("").length;
    if (letters >= 4 && letters <= 12) entities.push(full);
  }

  return entities;
}

function entitiesFromSegment(
  segment: string,
  frameWords: Set<string>
): string[] {
  const parts = contentParts(segment);
  if (parts.length === 0) return [];

  const entities: string[] = [];
  const joined = parts.join("");
  if (joined.length >= 4 && joined.length <= 12) {
    entities.push(joined);
  }

  entities.push(...phraseWindows(parts, frameWords));

  for (const p of parts) {
    if (p.length >= 4) entities.push(p);
  }
  return entities;
}

/** "Topic — Name One, Name Two" → segments after the dash/colon. */
function exampleTails(segment: string): string[] {
  const split = segment.split(/\s*[—–:-]\s*/);
  if (split.length < 2) return [segment];
  return split.slice(1).map((s) => s.trim()).filter(Boolean);
}

function isFrameToken(token: string, allTokens: string[]): boolean {
  if (CATEGORY_DESCRIPTORS.has(token)) return true;

  // "Mortal Kombat characters" — title-like tokens before a category word
  const categoryIndex = allTokens.findIndex((t) => CATEGORY_DESCRIPTORS.has(t));
  if (categoryIndex > 0) {
    const idx = allTokens.indexOf(token);
    if (idx >= 0 && idx < categoryIndex) return true;
  }

  return false;
}

export function parseInspiration(inspiration: string): ParsedInspiration {
  const themeTokens = new Set(tokensFromText(inspiration));
  const allTokens = [...themeTokens];
  const frameWords = new Set<string>();
  const entityCandidates: string[] = [];
  const seenEntity = new Set<string>();

  for (const token of allTokens) {
    if (isFrameToken(token, allTokens)) {
      frameWords.add(token);
    }
  }

  const segments = inspiration
    .split(/[,;\n]+|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const segmentTokens = tokensFromText(segment);
    const segmentIsFrameOnly =
      segmentTokens.length > 0 &&
      segmentTokens.every(
        (t) => frameWords.has(t) || CATEGORY_DESCRIPTORS.has(t)
      );

    if (segmentIsFrameOnly) continue;

    const segmentsToScan = [segment, ...exampleTails(segment)];

    for (const piece of segmentsToScan) {
      for (const entity of entitiesFromSegment(piece, frameWords)) {
        if (frameWords.has(entity) || CATEGORY_DESCRIPTORS.has(entity)) continue;
        if (entity.split(/\s+/).some((t) => frameWords.has(t))) continue;
        if (seenEntity.has(entity)) continue;
        seenEntity.add(entity);
        entityCandidates.push(entity);
      }
    }
  }

  return { entityCandidates, frameWords, themeTokens };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Words from the inspiration that must not appear in the clue surface. */
export function inspirationHiddenWords(inspiration: string): Set<string> {
  const parsed = parseInspiration(inspiration);
  const hidden = new Set<string>(parsed.themeTokens);

  for (const token of [...hidden]) {
    if (token.endsWith("s") && token.length > 4) {
      hidden.add(token.slice(0, -1));
    } else if (!token.endsWith("s")) {
      hidden.add(`${token}s`);
    }
  }

  return hidden;
}

export function inspirationWordsInClue(
  clue: string,
  inspiration: string
): string[] {
  const hidden = inspirationHiddenWords(inspiration);
  if (hidden.size === 0) return [];

  const body = clue.replace(/\(\d+(?:,\s*\d+)*\)\s*$/, "").trim();
  const found: string[] = [];

  for (const word of hidden) {
    if (new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(body)) {
      found.push(word);
    }
  }

  return [...new Set(found)];
}

export function phraseUsesHiddenInspirationWord(
  phrase: string,
  inspiration: string
): boolean {
  return inspirationWordsInClue(phrase, inspiration).length > 0;
}

export function isDictionaryWord(word: string): boolean {
  return trieHasWord(word.toLowerCase().replace(/[^a-z]/g, ""));
}

/** Single word or multi-word phrase where every word is in the dictionary. */
export function isDictionaryAnswer(answer: string): boolean {
  const words = normalizeAnswer(answer).split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  return words.every((w) => isDictionaryWord(w));
}

function answerTokensFailFrameChecks(
  answer: string,
  parsed: ParsedInspiration
): boolean {
  const tokens = normalizeAnswer(answer).toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  if (tokens.some((t) => parsed.frameWords.has(t))) return true;
  if (tokens.some((t) => CATEGORY_DESCRIPTORS.has(t))) return true;
  if (tokens.some((t) => isFrameDerivative(t, parsed))) return true;
  return false;
}

/**
 * Themed answers may be proper names outside the dictionary.
 * Dictionary fallback answers (fromTheme=false) must still be in the word list.
 */
export function isValidThemedAnswer(
  answer: string,
  parsed: ParsedInspiration,
  options: { fromTheme?: boolean; bounds?: AnswerLengthBounds } = {}
): boolean {
  const w = normalizeAnswer(answer);
  const letters = answerLetters(w);
  const bounds = options.bounds ?? { minLength: 3, maxLength: 10 };
  if (!answerLengthInBounds(letters.length, bounds)) return false;
  if (!/^[A-Z]+(\s+[A-Z]+)*$/.test(w)) return false;
  if (answerTokensFailFrameChecks(w, parsed)) return false;

  const tokens = w.split(/\s+/);
  if (tokens.some((t) => t.length < 2)) return false;

  if (isDictionaryAnswer(w)) return true;
  return options.fromTheme === true;
}

function isFrameDerivative(word: string, parsed: ParsedInspiration): boolean {
  const w = word.toLowerCase();
  for (const frame of parsed.frameWords) {
    if (w === frame) return true;
    if (w.startsWith(frame) || frame.startsWith(w)) return true;
    if (w.endsWith(frame)) return true;
  }
  return false;
}

/** Filter and normalize Claude- or user-suggested answer words. */
export function normalizeSuggestedAnswers(
  raw: string[],
  parsed: ParsedInspiration,
  minLength: number,
  maxLength: number | null,
  bounds?: AnswerLengthBounds
): string[] {
  const lengthBounds = bounds ?? { minLength, maxLength };
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const w = normalizeAnswer(item);
    if (!w) continue;
    const letters = answerLetters(w);
    if (!answerLengthInBounds(letters.length, lengthBounds)) continue;
    if (seen.has(w)) continue;

    if (!isValidThemedAnswer(w, parsed, { fromTheme: true, bounds: lengthBounds })) continue;

    seen.add(w);
    out.push(w);
  }

  return out;
}
