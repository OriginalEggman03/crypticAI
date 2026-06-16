import { answerLetters } from "./answer-format";

function fodderTokens(fodder: string): string[] {
  return fodder
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z]/g, ""))
    .filter(Boolean);
}

function multisetEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const t of a) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const t of b) {
    const n = counts.get(t);
    if (!n) return false;
    if (n === 1) counts.delete(t);
    else counts.set(t, n - 1);
  }
  return counts.size === 0;
}

const partitionCache = new Map<string, string[][]>();

/** All ways to split a string into 2+ contiguous segments (min segment length 2). */
function nontrivialPartitions(text: string, minPartLen = 2): string[][] {
  const key = `${text}|${minPartLen}`;
  const cached = partitionCache.get(key);
  if (cached) return cached;

  const results: string[][] = [];

  if (text.length >= minPartLen * 2) {
    for (let i = minPartLen; i <= text.length - minPartLen; i++) {
      const head = text.slice(0, i);
      const rest = text.slice(i);

      if (rest.length >= minPartLen) {
        results.push([head, rest]);
      }

      for (const tail of nontrivialPartitions(rest, minPartLen)) {
        results.push([head, ...tail]);
      }
    }
  }

  partitionCache.set(key, results);
  return results;
}

/**
 * True when fodder only reorders contiguous chunks of the answer (whitespace separation),
 * without scrambling letters inside those chunks.
 * e.g. CATWOMAN + "woman cat" — not a fair anagram.
 */
export function isTrivialWordReorderFodder(
  fodder: string,
  answer: string
): boolean {
  const letters = answerLetters(answer).toLowerCase();
  const tokens = fodderTokens(fodder);

  if (tokens.length < 2 || letters.length < 4) return false;

  for (const parts of nontrivialPartitions(letters)) {
    if (parts.length !== tokens.length) continue;
    if (multisetEqual(parts, tokens)) return true;
  }

  return false;
}

export function trivialFodderReason(
  fodder: string,
  answer: string
): string | null {
  if (!isTrivialWordReorderFodder(fodder, answer)) return null;
  return `Anagram fodder "${fodder}" only splits ${answer} into chunks and reorders them — letters must be scrambled, not just separated by spaces`;
}

export function filterNontrivialFodders(
  answer: string,
  fodders: string[]
): string[] {
  return fodders.filter((f) => !isTrivialWordReorderFodder(f, answer));
}
