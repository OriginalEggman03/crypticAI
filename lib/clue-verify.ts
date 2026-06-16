import {
  answerEnumeration,
  answerLetterCount,
  answerLetters,
  answerWords,
  enumerationMatchesAnswer,
  normalizeAnswer,
  parseEnumeration,
} from "./answer-format";

export { answerLetterCount };
import { clueHasAnagramIndicator } from "./anagram-indicators";
import type { ClueTypeOption } from "./clue-types";
import { inspirationWordsInClue } from "./inspiration-parse";
import { phraseAppearsAsFodderWords } from "./fodder-surface";
import { spellingRepairHint, verifyClueSpelling } from "./spell-check";

export type MechanicalClueType =
  | "hidden"
  | "reverse-hidden"
  | "anagram"
  | "homophone"
  | "cryptic-definition";

export interface PuzzleEntryDraft {
  answer: string;
  clue: string;
  clueType: string;
  anagramFodder?: string | null;
}

export interface VerificationFailure {
  index: number;
  answer: string;
  clue: string;
  clueType: string;
  reason: string;
}

const HOMOPHONE_INDICATOR =
  /\b(we hear|heard|hear|sounds? like|say|said|aloud|orally|speaking|reportedly|on the radio|recited|verbal|out loud|audibly|to the ear|sound of|voice of|vocal|pronounced|uttered)\b/i;

const HIDDEN_INDICATOR =
  /\b(in|inside|within|part of|partly|some|extract|hidden|concealed|holding|fragment|snippet|bit of|briefly|portion|from|among|between)\b/i;

const REVERSAL_INDICATOR =
  /\b(back|backwards|reverse|reversed|returning|retreat|up|rising|ascending|north|left|over)\b/i;

function normalizeLetters(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, "");
}

function stripEnumeration(clue: string): string {
  return clue.replace(/\(\d+(?:,\s*\d+)*\)\s*$/, "").trim();
}

function tokenize(text: string): string[] {
  return stripEnumeration(text)
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z]/g, "").toLowerCase())
    .filter(Boolean);
}

function countLetters(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of normalizeLetters(text)) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  return counts;
}

/** Letters used for anagram checks — alphabetic chars from each word, in order. */
function lettersFromPhrase(phrase: string): string {
  return normalizeLetters(tokenize(phrase).join(""));
}

export function anagramMismatchReason(
  fodder: string,
  answer: string
): string | null {
  const f = lettersFromPhrase(fodder);
  const a = normalizeLetters(answer);
  if (!f || !a) return "Empty anagram fodder or answer";

  if (f.length !== a.length) {
    return `Anagram fodder has ${f.length} letters (${f}) but ${answer} has ${a.length} (${a}) — counts must match exactly with no reuse`;
  }

  const cf = countLetters(f);
  const ca = countLetters(a);

  for (const [ch, fodderCount] of cf) {
    const answerCount = ca.get(ch) ?? 0;
    if (fodderCount !== answerCount) {
      return `Letter ${ch} appears ${fodderCount} time(s) in fodder but ${answerCount} in ${answer} — each letter may only be used once`;
    }
  }

  for (const [ch, answerCount] of ca) {
    const fodderCount = cf.get(ch) ?? 0;
    if (fodderCount !== answerCount) {
      return `Letter ${ch} appears ${answerCount} time(s) in ${answer} but ${fodderCount} in fodder — each letter may only be used once`;
    }
  }

  return null;
}

export function isAnagramOf(fodder: string, answer: string): boolean {
  return anagramMismatchReason(fodder, answer) === null;
}

function normalizeEntryType(raw: string | undefined): string {
  return (raw ?? "unknown").toLowerCase().replace(/\s+/g, "-");
}

function puzzleTypeIs(
  puzzleClueType: ClueTypeOption,
  type: string
): boolean {
  return puzzleClueType === type;
}

function entryTypeIs(entryType: string, type: string): boolean {
  return entryType.includes(type);
}

/** Ensure clue ends with correct enumeration for the answer. */
export function fixEnumerationInClue(clue: string, answer: string): string {
  const body = stripEnumeration(clue).trim();
  const enumStr = answerEnumeration(answer);
  if (!body || answerLetterCount(answer) === 0) return clue;
  return `${body} ${enumStr}`;
}

/** Capitalise the first letter of the clue body (final surface normalisation). */
export function capitalizeClueStart(clue: string): string {
  const trimmed = clue.trim();
  if (!trimmed) return trimmed;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (/[a-z]/.test(ch)) {
      return trimmed.slice(0, i) + ch.toUpperCase() + trimmed.slice(i + 1);
    }
    if (/[A-Z]/.test(ch)) {
      return trimmed;
    }
  }

  return trimmed;
}

export function verifyEnumeration(
  clue: string,
  answer: string
): string | null {
  const parsed = parseEnumeration(clue);
  if (!parsed) {
    return "Clue must end with length in parentheses, e.g. (5) or (6,4)";
  }
  if (!enumerationMatchesAnswer(clue, answer)) {
    const expected = answerEnumeration(answer);
    const actual = `(${parsed.join(",")})`;
    return `Enumeration ${actual} does not match answer ${normalizeAnswer(answer)} (expected ${expected})`;
  }
  return null;
}

export function verifyAnswerNotStandalone(
  clue: string,
  answer: string,
  allowEmbedded: boolean
): string | null {
  const words = answerWords(answer);
  if (words.length === 0) return "Empty answer";

  const text = stripEnumeration(clue).replace(/[^a-zA-Z\s]/g, " ");

  for (const word of words) {
    const standalone = new RegExp(`\\b${word}\\b`, "i");
    if (standalone.test(text)) {
      if (allowEmbedded && verifyHidden(clue, answer)) {
        return null;
      }
      return `Answer word ${word} appears as a standalone word in the clue`;
    }
  }
  return null;
}

/** Inspiration words must not appear in the clue — theme is implicit, not named. */
export function verifyInspirationWordsNotInClue(
  clue: string,
  inspiration: string
): string | null {
  if (!inspiration.trim()) return null;

  const found = inspirationWordsInClue(clue, inspiration);
  if (found.length === 0) return null;

  return `Clue must not contain words from the inspiration (${found.join(", ")}) — theme the clue without naming the topic`;
}

export function verifyHidden(clue: string, answer: string): boolean {
  const haystack = normalizeLetters(stripEnumeration(clue));
  const needle = normalizeLetters(answer);
  return needle.length > 0 && haystack.includes(needle);
}

export function verifyReverseHidden(clue: string, answer: string): boolean {
  const haystack = normalizeLetters(stripEnumeration(clue));
  const needle = normalizeLetters(answer).split("").reverse().join("");
  return needle.length > 0 && haystack.includes(needle);
}

export function phraseAppearsAsConsecutiveTokens(
  clue: string,
  phrase: string
): boolean {
  const clueTokens = tokenize(clue);
  const fodderTokens = tokenize(phrase);
  if (fodderTokens.length === 0) return false;

  for (let i = 0; i <= clueTokens.length - fodderTokens.length; i++) {
    if (fodderTokens.every((t, j) => clueTokens[i + j] === t)) {
      return true;
    }
  }
  return false;
}

/** Fodder words in clue — any order; punctuation only between fodder words. */
export function phraseAppearsAsFodderInClue(
  clue: string,
  phrase: string
): boolean {
  return phraseAppearsAsFodderWords(clue, phrase);
}

function findAnagramFodderInClue(
  clue: string,
  answer: string
): string | null {
  const answerLetters = normalizeLetters(answer);
  if (!answerLetters) return null;

  const tokens = stripEnumeration(clue).split(/\s+/).filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    for (let j = i; j < tokens.length; j++) {
      const phrase = tokens.slice(i, j + 1).join(" ");
      const phraseLetters = lettersFromPhrase(phrase);
      if (phraseLetters.length !== answerLetters.length) continue;
      if (isAnagramOf(phrase, answer)) {
        return phrase;
      }
    }
  }
  return null;
}

function fixAnagramFodder(entry: PuzzleEntryDraft): PuzzleEntryDraft {
  const entryType = normalizeEntryType(entry.clueType);
  if (!entryTypeIs(entryType, "anagram")) return entry;

  const fodder = entry.anagramFodder?.trim() ?? "";
  if (
    fodder &&
    isAnagramOf(fodder, entry.answer) &&
    phraseAppearsAsFodderInClue(entry.clue, fodder)
  ) {
    return entry;
  }

  const found = findAnagramFodderInClue(entry.clue, entry.answer);
  if (found) {
    return { ...entry, anagramFodder: found };
  }

  return entry;
}

export function prepareDraftsForVerification(
  entries: PuzzleEntryDraft[]
): PuzzleEntryDraft[] {
  return entries.map((entry) => {
    const withEnum = {
      ...entry,
      clue: fixEnumerationInClue(entry.clue, entry.answer),
    };
    return fixAnagramFodder(withEnum);
  });
}

export function dedupeFailuresForRepair(
  failures: VerificationFailure[]
): VerificationFailure[] {
  const byIndex = new Map<number, VerificationFailure[]>();
  for (const f of failures) {
    const list = byIndex.get(f.index) ?? [];
    list.push(f);
    byIndex.set(f.index, list);
  }

  return [...byIndex.entries()].flatMap(([index, list]) => {
    const primary =
      list.find((f) => f.clueType !== "spelling") ??
      list.find((f) => f.clueType !== "fairness") ??
      list[0];
    return primary ? [{ ...primary, index }] : [];
  });
}

export function summarizeFailures(failures: VerificationFailure[]): string {
  const types = [...new Set(failures.map((f) => f.clueType))];
  const entries = new Set(failures.map((f) => f.index)).size;
  return `${entries} clue(s) failed checks: ${types.join(", ")}`;
}

const MECHANICAL_CLUE_TYPES = new Set([
  "anagram",
  "hidden",
  "reverse-hidden",
  "homophone",
  "cryptic-definition",
]);

/** Last resort for mixed puzzles: drop strict mechanical typing on clues that still fail. */
export function relaxMechanicalTypesForAllMode(
  drafts: PuzzleEntryDraft[],
  failures: VerificationFailure[]
): PuzzleEntryDraft[] {
  const failedIndices = new Set(failures.map((f) => f.index));
  return drafts.map((entry, i) => {
    if (!failedIndices.has(i)) return entry;
    const failTypes = failures
      .filter((f) => f.index === i)
      .map((f) => f.clueType);
    if (failTypes.some((t) => MECHANICAL_CLUE_TYPES.has(t))) {
      return { ...entry, clueType: "charade", anagramFodder: null };
    }
    return entry;
  });
}

export function hasAnagramIndicator(clue: string): boolean {
  return clueHasAnagramIndicator(clue);
}

export function hasHomophoneIndicator(clue: string): boolean {
  return HOMOPHONE_INDICATOR.test(stripEnumeration(clue));
}

export function hasHiddenIndicator(clue: string): boolean {
  return HIDDEN_INDICATOR.test(stripEnumeration(clue));
}

export function hasReversalIndicator(clue: string): boolean {
  return REVERSAL_INDICATOR.test(stripEnumeration(clue));
}

export function verifyAnagram(
  clue: string,
  answer: string,
  declaredFodder?: string | null
): { ok: boolean; reason?: string } {
  const ans = normalizeLetters(answer);
  if (!ans) return { ok: false, reason: "Empty answer" };

  if (!hasAnagramIndicator(clue)) {
    return {
      ok: false,
      reason: "Anagram clue lacks a fair anagram indicator (e.g. broken, muddled, strange)",
    };
  }

  if (declaredFodder?.trim()) {
    const mismatch = anagramMismatchReason(declaredFodder, answer);
    if (mismatch) {
      return {
        ok: false,
        reason: `Declared anagram fodder "${declaredFodder}" does not rearrange to ${answer}: ${mismatch}`,
      };
    }
    if (!phraseAppearsAsFodderInClue(clue, declaredFodder)) {
      return {
        ok: false,
        reason: `Anagram fodder "${declaredFodder}" is not present in the clue (same words, any order; punctuation only between fodder words)`,
      };
    }
    return { ok: true };
  }

  const found = findAnagramFodderInClue(clue, answer);
  if (!found) {
    return {
      ok: false,
      reason: `No consecutive phrase in the clue has letters that anagram to ${answer}`,
    };
  }
  if (!phraseAppearsAsFodderInClue(clue, found)) {
    return {
      ok: false,
      reason: "Anagram fodder could not be matched to words in the clue",
    };
  }
  return { ok: true };
}

function shouldVerifyAnagram(
  entry: PuzzleEntryDraft,
  entryType: string,
  puzzleClueType: ClueTypeOption
): boolean {
  if (puzzleTypeIs(puzzleClueType, "anagram")) return true;
  return entryTypeIs(entryType, "anagram");
}

function shouldVerifyHidden(
  entry: PuzzleEntryDraft,
  entryType: string,
  puzzleClueType: ClueTypeOption
): boolean {
  if (puzzleTypeIs(puzzleClueType, "hidden")) return true;
  return entryTypeIs(entryType, "hidden") && !entryTypeIs(entryType, "reverse");
}

function shouldVerifyReverseHidden(
  entry: PuzzleEntryDraft,
  entryType: string,
  puzzleClueType: ClueTypeOption
): boolean {
  if (puzzleTypeIs(puzzleClueType, "reverse-hidden")) return true;
  if (entryTypeIs(entryType, "reverse-hidden") || entryTypeIs(entryType, "reverse")) {
    return true;
  }
  return false;
}

function shouldVerifyHomophone(
  entryType: string,
  puzzleClueType: ClueTypeOption
): boolean {
  return puzzleTypeIs(puzzleClueType, "homophone") || entryTypeIs(entryType, "homophone");
}

function shouldVerifyCrypticDefinition(
  entryType: string,
  puzzleClueType: ClueTypeOption
): boolean {
  return (
    puzzleTypeIs(puzzleClueType, "cryptic-definition") ||
    entryTypeIs(entryType, "cryptic-definition")
  );
}

function pushFailure(
  failures: VerificationFailure[],
  index: number,
  entry: PuzzleEntryDraft,
  checkType: string,
  reason: string
): void {
  failures.push({
    index,
    answer: entry.answer,
    clue: entry.clue,
    clueType: checkType,
    reason,
  });
}

export function verifyEntry(
  entry: PuzzleEntryDraft,
  index: number,
  puzzleClueType: ClueTypeOption,
  themeWords: Set<string> = new Set()
): VerificationFailure[] {
  const failures: VerificationFailure[] = [];
  const entryType = normalizeEntryType(entry.clueType);

  const enumFail = verifyEnumeration(entry.clue, entry.answer);
  if (enumFail) pushFailure(failures, index, entry, "enumeration", enumFail);

  if (entryType === "unknown" && puzzleClueType === "all") {
    pushFailure(
      failures,
      index,
      entry,
      "metadata",
      "clueType must be set to a specific type (not unknown)"
    );
  }

  const allowEmbedded =
    shouldVerifyHidden(entry, entryType, puzzleClueType) ||
    shouldVerifyReverseHidden(entry, entryType, puzzleClueType);

  const standaloneFail = verifyAnswerNotStandalone(
    entry.clue,
    entry.answer,
    allowEmbedded
  );
  if (standaloneFail) {
    pushFailure(failures, index, entry, "fairness", standaloneFail);
  }

  if (shouldVerifyAnagram(entry, entryType, puzzleClueType)) {
    const result = verifyAnagram(entry.clue, entry.answer, entry.anagramFodder);
    if (!result.ok) {
      pushFailure(failures, index, entry, "anagram", result.reason ?? "Anagram failed");
    }
  }

  if (shouldVerifyHidden(entry, entryType, puzzleClueType)) {
    if (!hasHiddenIndicator(entry.clue)) {
      pushFailure(
        failures,
        index,
        entry,
        "hidden",
        "Hidden clue lacks a fair hidden-word indicator (e.g. in, part of, some)"
      );
    }
    if (!verifyHidden(entry.clue, entry.answer)) {
      pushFailure(
        failures,
        index,
        entry,
        "hidden",
        `Answer ${entry.answer} is not hidden as consecutive letters in the clue`
      );
    }
  }

  if (shouldVerifyReverseHidden(entry, entryType, puzzleClueType)) {
    if (!hasHiddenIndicator(entry.clue) && !hasReversalIndicator(entry.clue)) {
      pushFailure(
        failures,
        index,
        entry,
        "reverse-hidden",
        "Reverse-hidden clue needs a hidden indicator and/or reversal indicator"
      );
    }
    if (!verifyReverseHidden(entry.clue, entry.answer)) {
      pushFailure(
        failures,
        index,
        entry,
        "reverse-hidden",
        `Answer ${entry.answer} reversed is not hidden as consecutive letters in the clue`
      );
    }
  }

  if (shouldVerifyHomophone(entryType, puzzleClueType)) {
    if (!hasHomophoneIndicator(entry.clue)) {
      pushFailure(
        failures,
        index,
        entry,
        "homophone",
        "Homophone clue lacks a fair sound indicator (e.g. we hear, reportedly, sounds like)"
      );
    }
  }

  if (shouldVerifyCrypticDefinition(entryType, puzzleClueType)) {
    const body = stripEnumeration(entry.clue);
    if (!body.includes("?")) {
      pushFailure(
        failures,
        index,
        entry,
        "cryptic-definition",
        "Cryptic definition clues should contain a question mark"
      );
    }
  }

  const spellingFail = verifyClueSpelling(entry.clue, themeWords);
  if (spellingFail) {
    pushFailure(failures, index, entry, "spelling", spellingFail);
  }

  return failures;
}

export function verifyPuzzleEntries(
  entries: PuzzleEntryDraft[],
  puzzleClueType: ClueTypeOption,
  themeWords: Set<string> = new Set()
): VerificationFailure[] {
  return entries.flatMap((entry, index) =>
    verifyEntry(entry, index, puzzleClueType, themeWords)
  );
}

export function clueLetterStream(clue: string): string {
  return normalizeLetters(stripEnumeration(clue));
}

/** Actionable hint for the repair model when hidden verification fails. */
export function hiddenRepairHint(answer: string, clue: string): string {
  const need = normalizeLetters(answer);
  const stream = clueLetterStream(clue);
  const ok = stream.includes(need);
  return [
    `Embed the letters ${need} consecutively in the clue (spaces/punctuation ignored).`,
    `Current letter stream: "${stream.slice(0, 80)}${stream.length > 80 ? "…" : ""}"`,
    ok
      ? "Stream contains the answer — check hidden indicator or standalone-word rule."
      : `Stream does NOT contain ${need}. Example pattern for ${need}: hide inside a longer phrase like "${embedExample(need)}"`,
  ].join(" ");
}

function embedExample(answer: string): string {
  if (answer.length <= 4) {
    return `…${answer.toLowerCase()}… in surrounding words`;
  }
  const mid = Math.floor(answer.length / 2);
  const a = answer.slice(0, mid).toLowerCase();
  const b = answer.slice(mid).toLowerCase();
  return `word ending ${a} + word starting ${b} (letters run together as ${answer})`;
}

export function failureRepairHint(failure: VerificationFailure): string {
  switch (failure.clueType) {
    case "hidden":
    case "reverse-hidden":
      return hiddenRepairHint(failure.answer, failure.clue);
    case "anagram":
      return `Set anagramFodder to consecutive words from the clue whose letters rearrange to ${failure.answer} — same length, each letter used exactly once (e.g. ${failure.answer.length} letters). ${failure.reason}`;
    case "spelling":
      return spellingRepairHint(failure.reason);
    case "enumeration":
      return `Set the bracketed length at the end to (${answerLetterCount(failure.answer)}) for answer ${failure.answer}. ${failure.reason}`;
    default:
      return failure.reason;
  }
}
