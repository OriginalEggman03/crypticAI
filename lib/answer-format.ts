/** Normalise crossword answers — single or multi-word (e.g. JOHNNY CAGE). */

export const MAX_ANSWER_WORDS = 3;
export const MIN_ANSWER_WORD_LEN = 3;

export function normalizeAnswer(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function answerWords(answer: string): string[] {
  return normalizeAnswer(answer)
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Z]/g, ""))
    .filter(Boolean);
}

export function answerLetters(answer: string): string {
  return normalizeAnswer(answer).replace(/\s/g, "");
}

export function answerLetterCount(answer: string): number {
  return answerLetters(answer).length;
}

export function isMultiWordAnswer(answer: string): boolean {
  return answerWords(answer).length > 1;
}

export function answerEnumeration(answer: string): string {
  const words = answerWords(answer);
  if (words.length === 0) return "(0)";
  if (words.length === 1) return `(${words[0].length})`;
  return `(${words.map((w) => w.length).join(",")})`;
}

export function parseEnumeration(clue: string): number[] | null {
  const m = clue.match(/\(([\d,\s]+)\)\s*$/);
  if (!m) return null;
  const parts = m[1]
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
  return parts.length > 0 ? parts : null;
}

export function enumerationMatchesAnswer(clue: string, answer: string): boolean {
  const parsed = parseEnumeration(clue);
  if (!parsed) return false;

  const words = answerWords(answer);
  const total = answerLetters(answer).length;

  if (parsed.length === 1) {
    return parsed[0] === total;
  }

  if (words.length !== parsed.length) return false;
  return words.every((w, i) => w.length === parsed[i]);
}

/** True when fodder uses the same word multiset as the answer (invalid wordplay). */
export function fodderDuplicatesAnswer(fodder: string, answer: string): boolean {
  const f = [...fodder.toLowerCase().split(/\s+/)].sort();
  const a = answerWords(answer).map((w) => w.toLowerCase()).sort();
  if (f.length === 0 || a.length === 0) return false;
  return f.length === a.length && f.every((t, i) => t === a[i]);
}

/** True when a whole answer word appears as its own token in the fodder (e.g. MAN in "orin man" for IRON MAN). */
export function fodderExposesAnswerWord(fodder: string, answer: string): boolean {
  const fodderTokens = fodder
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z]/g, ""))
    .filter(Boolean);
  if (fodderTokens.length === 0) return false;

  return answerWords(answer).some((word) =>
    fodderTokens.includes(word.toLowerCase())
  );
}
