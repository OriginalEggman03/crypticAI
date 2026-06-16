import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import nspell from "nspell";

type SpellChecker = ReturnType<typeof nspell>;

let checker: SpellChecker | null = null;
let loading: Promise<SpellChecker> | null = null;

const SKIP_WORDS = new Set([
  "a",
  "i",
  "o",
  "ok",
  "eg",
  "etc",
  "vs",
  "viz",
  "cf",
  "re",
]);

function dictionaryDir(): string {
  return join(process.cwd(), "node_modules", "dictionary-en-gb");
}

function loadBritishDictionary(): SpellChecker {
  const dictDir = dictionaryDir();
  const affPath = join(dictDir, "index.aff");
  const dicPath = join(dictDir, "index.dic");

  if (!existsSync(affPath) || !existsSync(dicPath)) {
    throw new Error(
      "British English dictionary not found. Run npm install dictionary-en-gb."
    );
  }

  const aff = readFileSync(affPath);
  const dic = readFileSync(dicPath);
  return nspell({ aff, dic });
}

export function themeWordsFromInspiration(inspiration: string): Set<string> {
  const words = inspiration.match(/[a-zA-Z]{3,}/g) ?? [];
  return new Set(words.map((w) => w.toLowerCase()));
}

export function buildThemeWords(
  inspiration: string,
  answers: string[]
): Set<string> {
  const words = themeWordsFromInspiration(inspiration);
  for (const answer of answers) {
    const normalized = answer.toLowerCase().replace(/[^a-z]/g, "");
    if (normalized.length >= 3) words.add(normalized);
  }
  return words;
}

function stripEnumeration(clue: string): string {
  return clue.replace(/\(\d+\)\s*$/, "").trim();
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function extractClueWords(clue: string): { original: string; index: number }[] {
  const body = stripEnumeration(clue);
  const words: { original: string; index: number }[] = [];
  let wordIndex = 0;

  for (const token of body.split(/\s+/)) {
    const matches = token.match(/[a-zA-Z']+/g);
    if (!matches) continue;

    for (const original of matches) {
      words.push({ original, index: wordIndex });
      wordIndex++;
    }
  }

  return words;
}

function shouldSkipWord(
  original: string,
  wordIndex: number,
  themeWords: Set<string>
): boolean {
  const letters = original.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 2) return true;

  if (letters.length <= 3) return true;

  if (/^[a-z]+'[a-z]+$/i.test(original)) return true;

  if (/-/.test(original)) return true;

  if (/^[A-Z0-9]{2,}$/.test(letters)) return true;

  if (wordIndex === 0 && /^[A-Z]/.test(original)) return true;

  if (wordIndex > 0 && /^[A-Z][a-z]/.test(original)) {
    return true;
  }

  const normalized = letters.toLowerCase();
  if (SKIP_WORDS.has(normalized)) return true;
  if (themeWords.has(normalized)) return true;

  return false;
}

function checkWord(spell: SpellChecker, original: string): string | null {
  const letters = original.replace(/[^a-zA-Z]/g, "");
  const normalized = letters.toLowerCase();
  const apostropheForm = original.includes("'") ? original.toLowerCase() : null;

  if (
    spell.correct(normalized) ||
    spell.correct(letters) ||
    (apostropheForm && spell.correct(apostropheForm))
  ) {
    return null;
  }

  const suggestions = spell.suggest(normalized).slice(0, 5);
  const close = suggestions.find((s) => levenshtein(normalized, s) === 1);
  if (close) {
    return `"${original}" (did you mean "${close}"?)`;
  }

  return null;
}

export async function ensureSpellChecker(): Promise<void> {
  if (checker) return;
  if (!loading) {
    loading = Promise.resolve().then(() => {
      checker = loadBritishDictionary();
      return checker;
    });
  }
  await loading;
}

export function verifyClueSpelling(
  clue: string,
  themeWords: Set<string> = new Set()
): string | null {
  if (!checker) return null;

  const misspellings: string[] = [];

  for (const { original, index } of extractClueWords(clue)) {
    if (shouldSkipWord(original, index, themeWords)) continue;

    const issue = checkWord(checker, original);
    if (issue) misspellings.push(issue);
  }

  if (misspellings.length === 0) return null;

  const listed = misspellings.slice(0, 3).join("; ");
  const extra =
    misspellings.length > 3 ? ` (+${misspellings.length - 3} more)` : "";
  return `Possible spelling error(s): ${listed}${extra}`;
}

export function spellingRepairHint(reason: string): string {
  return `${reason}. Use standard British English spelling for every word in the clue surface.`;
}
