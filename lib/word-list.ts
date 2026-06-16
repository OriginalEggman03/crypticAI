import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIN_WORD_LEN = 3;
const MAX_WORD_LEN = 12;

let cachedWords: string[] | null = null;

function dictionaryPath(): string {
  return join(process.cwd(), "node_modules", "dictionary-en-gb", "index.dic");
}

function normalizeWord(raw: string): string | null {
  const word = raw.split("/")[0].toLowerCase().replace(/[^a-z]/g, "");
  if (word.length < MIN_WORD_LEN || word.length > MAX_WORD_LEN) return null;
  return word;
}

/** British dictionary words (3–12 letters), loaded once. */
export function loadBritishWords(): string[] {
  if (cachedWords) return cachedWords;

  const dicPath = dictionaryPath();
  if (!existsSync(dicPath)) {
    throw new Error(
      "British English dictionary not found. Run npm install dictionary-en-gb."
    );
  }

  const lines = readFileSync(dicPath, "utf8").split(/\r?\n/);
  const expected = parseInt(lines[0] ?? "0", 10);
  const seen = new Set<string>();
  const words: string[] = [];

  for (let i = 1; i < lines.length && i <= expected; i++) {
    const word = normalizeWord(lines[i]?.trim() ?? "");
    if (!word || seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }

  cachedWords = words;
  return words;
}

export function wordsByLength(words: string[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const word of words) {
    const list = map.get(word.length) ?? [];
    list.push(word);
    map.set(word.length, list);
  }
  return map;
}
