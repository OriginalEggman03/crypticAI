import { answerWords, normalizeAnswer } from "./answer-format";
import {
  CATEGORY_DESCRIPTORS,
  type ParsedInspiration,
} from "./inspiration-parse";
import {
  isSpellingLookalikeOfFrame,
  isWeakThematicAnswer,
} from "./theme-link-quality";

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function isMorphologicalDerivative(word: string, base: string): boolean {
  if (word === base) return false;
  return word.startsWith(base) || base.startsWith(word) || word.endsWith(base);
}

/** Score how suitable a word is as an ANSWER for this inspiration. */
function scoreSingleToken(
  token: string,
  parsed: ParsedInspiration
): number {
  const w = token.toLowerCase();
  let score = 0;

  for (const entity of parsed.entityCandidates) {
    if (entity.includes(" ")) {
      if (entity === w) score += 500;
      else if (entity.split(/\s+/).includes(w)) score += 300;
    } else {
      if (w === entity) score += 500;
    }
  }

  if (parsed.frameWords.has(w)) score -= 300;
  if (CATEGORY_DESCRIPTORS.has(w)) score -= 250;

  for (const frame of parsed.frameWords) {
    if (isMorphologicalDerivative(w, frame)) score -= 180;
    else if (w.includes(frame) && w !== frame) score -= 120;
  }

  for (const theme of parsed.themeTokens) {
    if (parsed.frameWords.has(theme) || CATEGORY_DESCRIPTORS.has(theme)) {
      continue;
    }
    if (w === theme) score += 80;
  }

  if (isSpellingLookalikeOfFrame(w, parsed)) score -= 500;

  return score;
}

export function scoreAnswerRelevance(
  answer: string,
  parsed: ParsedInspiration,
  suggestedAnswers?: Set<string>
): number {
  const normalized = normalizeAnswer(answer);
  const words = answerWords(normalized);
  let score = 0;

  if (suggestedAnswers?.has(normalized)) {
    score += 400;
  }

  for (const entity of parsed.entityCandidates) {
    if (normalized.toLowerCase() === entity) score += 500;
    else if (entity.includes(" ") && normalized.toLowerCase().replace(/\s/g, "") === entity.replace(/\s/g, "")) {
      score += 450;
    }
  }

  if (isWeakThematicAnswer(normalized, parsed)) {
    return -500;
  }

  if (words.length === 1) {
    score += scoreSingleToken(words[0], parsed);
  } else {
    for (const word of words) {
      score += scoreSingleToken(word, parsed) * 0.85;
    }
    score += 60;
  }

  return score;
}

export function scoreFodderRelevance(
  fodder: string,
  parsed: ParsedInspiration
): number {
  const tokens = fodder.toLowerCase().split(/\s+/);
  let score = 0;
  for (const token of tokens) {
    score += scoreAnswerRelevance(token, parsed) * 0.3;
  }
  return score;
}
