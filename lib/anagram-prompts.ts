import { answerLengthRuleForPrompt, type AnswerLengthBounds } from "./anagram-difficulty";
import { answerEnumeration } from "./answer-format";
import {
  anagramIndicatorExamplesForPrompt,
  indicatorChoiceGuidance,
  OVERUSED_ANAGRAM_INDICATORS,
} from "./anagram-indicators";
import { MAX_LINKING_WORDS } from "./clue-surface-link";
import { surfaceCraftRules, FODDER_PUNCTUATION_RULE, SURFACE_MISDIRECTION_RULE } from "./clue-surface-rules";
import { inspirationHiddenWords } from "./inspiration-parse";
import type { AnagramClueDraft } from "./types";

/** Exact system message sent to Claude for the setter call. */
export const ANAGRAM_SETTER_SYSTEM =
  "You are an expert British cryptic crossword setter. You write anagram clues only. Reply with a single JSON object — no markdown fences, no commentary before or after.";

/** Exact system message sent to Claude for repair calls. */
export const ANAGRAM_REPAIR_SYSTEM =
  "You fix anagram cryptic clues that failed automated letter-count verification. Reply with a single JSON object — no markdown fences, no commentary before or after.";

/** Claude writes surface wording only — answer and fodder are locked by code. */
export const ANAGRAM_SURFACE_SYSTEM =
  "You are an expert British cryptic crossword setter. You write anagram clue surfaces only. The answer and anagram fodder are fixed — do not change them. Reply with a single JSON object — no markdown fences, no commentary before or after.";

export const ANAGRAM_SURFACE_REPAIR_SYSTEM =
  "You fix anagram clue surfaces that failed automated checks. The answer and anagram fodder are fixed — do not change them. Reply with a single JSON object — no markdown fences, no commentary before or after.";

/** Claude suggests only a themed answer; fodder is found programmatically. */
export const ANAGRAM_ANSWER_SYSTEM =
  "You pick a single English crossword answer word for a themed anagram clue. Reply with a single JSON object — no markdown fences, no commentary before or after.";

const ANAGRAM_JSON_SCHEMA = `{
  "answer": "UPPERCASE — single word or multi-word name with spaces (e.g. JOHNNY CAGE)",
  "clue": "full cryptic clue ending with (N) or (N,M) for multi-word answers",
  "anagramFodder": "exact fodder words from the clue (same spelling; order in JSON may differ from clue order)",
  "definition": "which phrase in the clue defines the answer",
  "anagramIndicator": "which word(s) signal the anagram"
}`;

const ANAGRAM_INDICATOR_EXAMPLES = anagramIndicatorExamplesForPrompt();

/** User message for the initial anagram clue request. */
export function buildAnagramSetterPrompt(inspiration: string): string {
  return `Write exactly ONE British cryptic crossword clue. It must be an anagram clue.

THEME / INSPIRATION
${inspiration.trim() || "(none given)"}

CLUE TYPE (mandatory)
Anagram only: a definition of the answer plus wordplay where consecutive words in the clue (the fodder) rearrange to form the answer, with a fair anagram indicator (e.g. ${ANAGRAM_INDICATOR_EXAMPLES}).

MECHANICAL RULES (verified in code before the clue is accepted)
1. Answer: UPPERCASE, clearly linked to the inspiration — one word (SCORPION) or a multi-word name with spaces (JOHNNY CAGE, LIU KANG).
2. anagramFodder: mandatory — copy the EXACT consecutive words from the clue (same spelling as they appear in the clue body).
3. Letter discipline: count every letter (ignore spaces in the answer). Fodder and answer must use the SAME letters exactly once.
4. Enumeration: single word → (N); multi-word → comma-separated word lengths, e.g. JOHNNY CAGE → (6,4).
5. Do not write any answer word as a standalone word in the clue.
6. Include a clear anagram indicator word or phrase.

SELF-CHECK before responding
- Strip spaces/punctuation from fodder → count letters → must equal answer length.
- Verify fodder letters are an anagram of answer letters (multiset equality).

Return ONLY valid JSON:
${ANAGRAM_JSON_SCHEMA}`;
}

/** User message when automated verification rejects a draft. */
export function buildAnagramRepairPrompt(
  inspiration: string,
  draft: AnagramClueDraft,
  errors: string[]
): string {
  const errorList = errors.map((e) => `- ${e}`).join("\n");

  return `This anagram clue FAILED automated verification. Rewrite it so every check passes.

THEME / INSPIRATION
${inspiration.trim()}

FAILED DRAFT
${JSON.stringify(draft, null, 2)}

VERIFICATION ERRORS
${errorList}

FIX INSTRUCTIONS
- Keep anagram clue type only.
- anagramFodder must be exact consecutive words from your new clue.
- Fodder and answer must have identical letter counts (same length, each letter once).
- Include an anagram indicator (e.g. ${ANAGRAM_INDICATOR_EXAMPLES}) and correct enumeration (N) at the end.
- You may change the answer to a different on-theme word if needed.

Return ONLY valid JSON:
${ANAGRAM_JSON_SCHEMA}`;
}

const ANSWER_JSON_SCHEMA = `{
  "answer": "UPPERCASE single word"
}`;

const ANSWER_LIST_SCHEMA = `{
  "answers": ["WORD", "MULTI WORD NAME", "..."]
}`;

/** Claude suggests specific themed answers (e.g. character names) for pair search. */
export const ANAGRAM_ANSWER_LIST_SYSTEM =
  "You suggest crossword answer words for a themed anagram puzzle. Reply with JSON only.";

export function buildAnagramAnswerListPrompt(
  inspiration: string,
  bounds: AnswerLengthBounds,
  excludeAnswers: string[] = []
): string {
  const excludeBlock =
    excludeAnswers.length > 0
      ? `
ALREADY USED — do NOT suggest these again:
${excludeAnswers.map((a) => `- ${a}`).join("\n")}

Suggest up to 20 NEW answers that are not in the list above.`
      : `Suggest up to 16 crossword ANSWERS for this inspiration.`;

  return `${excludeBlock}

THEME / INSPIRATION
${inspiration.trim()}

RULES
1. Each answer must be a GENUINE entity from the theme — a named character, place, item, title, etc.
2. REJECT frame/description words from the inspiration phrase (e.g. for "Mortal Kombat characters" do NOT suggest MORTAL, KOMBAT, CHARACTER).
3. REJECT spelling lookalikes of the title that are NOT real theme entities (e.g. for "Batman characters" suggest JOKER, SCARECROW, ROBIN, ALFRED, PENGUIN, BANE — NOT BADMAN, BATON, or other words that merely resemble BATMAN in spelling).
4. Use multi-word names with a space when that is the real name (JOHNNY CAGE, LIU KANG).
5. Single-word proper names are fine even if not dictionary words (RAIDEN, SCORPION).
6. ${answerLengthRuleForPrompt(bounds)}
7. Prioritise well-known icons from the theme over obscure or tangential dictionary words.

Return ONLY valid JSON:
${ANSWER_LIST_SCHEMA}`;
}

/** Ask Claude for a themed answer when the dictionary has no obvious pair. */
export function buildAnagramAnswerPrompt(inspiration: string): string {
  return `Pick exactly ONE English word to use as the answer in a British cryptic anagram clue.

THEME / INSPIRATION
${inspiration.trim()}

RULES
1. Single word, UPPERCASE in JSON.
2. A specific entity from the theme — not a generic descriptor word from the inspiration phrase.
3. Must be a real English word that could appear in a broadsheet crossword.
4. Do not return the clue — only the answer.

Return ONLY valid JSON:
${ANSWER_JSON_SCHEMA}`;
}

/** Write clue surface around a programmatically verified answer+fodder pair. */
export function buildAnagramSurfacePrompt(
  inspiration: string,
  answer: string,
  anagramFodder: string
): string {
  const len = answer.replace(/[^A-Z]/g, "").length;

  return `Write exactly ONE British cryptic anagram clue surface.

THEME / INSPIRATION
${inspiration.trim()}

LOCKED WORDPLAY (do not change — verified in code)
- answer: ${answer}
- anagramFodder: ${anagramFodder}
- The letters of "${anagramFodder}" rearrange to form ${answer}. This is already verified.

YOUR TASK
Write a natural cryptic clue that:
1. Uses every word from "${anagramFodder}" in the clue (exact spelling; any order; ${FODDER_PUNCTUATION_RULE})
2. Places the definition at the start OR the end — whichever is more interesting.
3. Includes a fair anagram indicator (e.g. ${ANAGRAM_INDICATOR_EXAMPLES}).
4. Uses at most ${MAX_LINKING_WORDS} linking words between definition and wordplay — nothing superfluous.
5. Ends with (${len}).
6. Does NOT contain ${answer} as a standalone word.

Return ONLY valid JSON:
${ANAGRAM_JSON_SCHEMA}`;
}

/** Repair surface-only failures without changing answer or fodder. */
export function buildAnagramSurfaceRepairPrompt(
  inspiration: string,
  draft: AnagramClueDraft,
  errors: string[],
  lockedAnswer: string,
  lockedFodder: string
): string {
  const errorList = errors.map((e) => `- ${e}`).join("\n");

  return `This anagram clue surface FAILED automated verification. Rewrite the clue text only.

THEME / INSPIRATION
${inspiration.trim()}

LOCKED (must not change)
- answer: ${lockedAnswer}
- anagramFodder: ${lockedFodder}

FAILED DRAFT
${JSON.stringify(draft, null, 2)}

VERIFICATION ERRORS
${errorList}

FIX INSTRUCTIONS
- Keep answer "${lockedAnswer}" and anagramFodder "${lockedFodder}" exactly.
- Every fodder word must appear in the new clue (any order; ${FODDER_PUNCTUATION_RULE})
- Include an anagram indicator (e.g. ${ANAGRAM_INDICATOR_EXAMPLES}) and correct enumeration (${lockedAnswer.length}).
- Do not write ${lockedAnswer} as a standalone word in the clue.

Return ONLY valid JSON:
${ANAGRAM_JSON_SCHEMA}`;
}

const PAIR_SELECT_SCHEMA = `{
  "selectedIndex": 0,
  "reason": "brief explanation"
}`;

/** Claude picks the best answer+fodder pair from programmatic candidates. */
export const ANAGRAM_PAIR_SELECT_SYSTEM =
  "You select the best crossword anagram pair for a theme. Letter-math is already verified. Reply with JSON only.";

export function buildPairSelectPrompt(
  inspiration: string,
  candidates: { answer: string; fodder: string; isPhrase?: boolean; themeScore: number }[]
): string {
  const list = candidates
    .map(
      (c, i) =>
        `${i}. answer=${c.answer} fodder="${c.fodder}" themeScore=${c.themeScore}`
    )
    .join("\n");

  return `Pick the best anagram pair for a British cryptic clue.

THEME / INSPIRATION
${inspiration.trim()}

CANDIDATES (answer and fodder letters already match exactly — verified in code)
${list}

RULES
1. Pick the most SPECIFIC answer tied to the inspiration — a real character, item, or name from that world.
2. REJECT answers that are just topic-description words or morphological variants (IMMORTAL, MORTALITY, CHARACTERS).
3. REJECT spelling lookalikes of the title that are not genuine theme entities (e.g. BADMAN for a Batman theme — choose SCARECROW, ROBIN, JOKER instead).
4. Each candidate is a different answer — pick the best answer first, then its fodder.
5. Single-word and multi-word fodder are equally valid — pick whichever will read most naturally as consecutive words in a clue sentence, with no bias toward length.
6. Fodder must use ordinary dictionary words only; obscure personal names (e.g. agnew) are never allowed; famous names and places (Oort, John, Paris, London, Texas) only when capitalised.
7. Answers may be proper names outside the dictionary; fodder must always be dictionary words.

Return ONLY valid JSON:
${PAIR_SELECT_SCHEMA}`;
}

/** Claude polishes a verified template clue without changing answer or fodder. */
export const ANAGRAM_TEMPLATE_POLISH_SYSTEM =
  "You are an expert British cryptic crossword setter. You rewrite anagram clue surfaces into challenging, publishable broadsheet sentences. The answer and fodder word set are fixed. Reply with JSON only.";

function surfacePolishRules(
  answer: string,
  anagramFodder: string,
  enumeration: string,
  inspiration: string,
  avoidIndicators: string[] = []
): string {
  const overused = [...OVERUSED_ANAGRAM_INDICATORS].join(", ");

  const hiddenWords = [...inspirationHiddenWords(inspiration)].sort();
  const extraRules: string[] = [
    `Capitalise proper names, eponyms, and places in the fodder and anywhere else in the clue (e.g. "Oort", "John", "Paris", "Poole"). Do not use obscure personal names (e.g. Agnew).`,
    `Write a grammatical English sentence — the fodder cluster must read naturally (good: "That'd army, in chaos"; bad: "Thatd, Mary"). Use apostrophes in contractions.`,
    SURFACE_MISDIRECTION_RULE,
    `Do NOT use these overused indicators unless unavoidable: ${overused}.`,
    indicatorChoiceGuidance(avoidIndicators),
  ];
  if (hiddenWords.length > 0) {
    extraRules.push(
      `Do NOT use any word from the inspiration in the clue surface: ${hiddenWords.join(", ")}. The solver knows the theme — imply it without naming it.`
    );
  }
  if (avoidIndicators.length > 0) {
    extraRules.push(
      `Do NOT reuse these indicators already seen for this theme: ${avoidIndicators.join(", ")}.`
    );
  }

  return surfaceCraftRules({
    answer,
    anagramFodder,
    enumeration,
    extraRules,
  });
}

export function buildTemplatePolishPrompt(
  inspiration: string,
  answer: string,
  anagramFodder: string,
  templateClue: string,
  avoidIndicators: string[] = []
): string {
  const enumeration = answerEnumeration(answer);

  return `Rewrite this verified anagram clue into a harder, more interesting broadsheet surface.

THEME / INSPIRATION
${inspiration.trim()}

LOCKED (do not change)
- answer: ${answer}
- anagramFodder word set: ${anagramFodder} (every word must appear; you may reorder; ${FODDER_PUNCTUATION_RULE})

TEMPLATE (letter-math is correct — improve the prose and misdirection)
${templateClue}

${surfacePolishRules(answer, anagramFodder, enumeration, inspiration, avoidIndicators)}

Return ONLY valid JSON:
${ANAGRAM_JSON_SCHEMA}`;
}

export function buildTemplatePolishRepairPrompt(
  inspiration: string,
  draft: AnagramClueDraft,
  errors: string[],
  lockedAnswer: string,
  lockedFodder: string,
  templateClue: string,
  avoidIndicators: string[] = []
): string {
  const errorList = errors.map((e) => `- ${e}`).join("\n");
  const enumeration = answerEnumeration(lockedAnswer);

  return `Polished clue failed verification. Fix the wording only.

THEME: ${inspiration.trim()}
LOCKED: answer ${lockedAnswer}, fodder "${lockedFodder}"
ORIGINAL TEMPLATE: ${templateClue}

FAILED DRAFT
${JSON.stringify(draft, null, 2)}

ERRORS
${errorList}

${surfacePolishRules(lockedAnswer, lockedFodder, enumeration, inspiration, avoidIndicators)}

Return ONLY valid JSON:
${ANAGRAM_JSON_SCHEMA}`;
}

/** Second pass: rewrite only the anagram indicator phrase for a more natural surface. */
export const ANAGRAM_INDICATOR_REFINE_SYSTEM =
  "You are an expert British cryptic crossword setter. You improve anagram clue surfaces by choosing the indicator that reads most naturally in context — single-word and multi-word are equally valid. The answer and fodder are fixed. Reply with JSON only.";

function indicatorRefineRules(
  answer: string,
  anagramFodder: string,
  enumeration: string,
  currentClue: string,
  avoidIndicators: string[] = []
): string {
  const overused = [...OVERUSED_ANAGRAM_INDICATORS].join(", ");

  return `TASK
Rewrite this clue for a sharper surface. Change wording for difficulty and flow — not the answer, fodder word set, or enumeration.

CURRENT CLUE
${currentClue}

LOCKED
- answer: ${answer}
- anagramFodder: ${anagramFodder} (every word in the clue; any order; ${FODDER_PUNCTUATION_RULE})
- enumeration: ${enumeration}

${indicatorChoiceGuidance(avoidIndicators)}

RULES
1. Definition may be at the start or the end — pick whichever reads better.
2. Pick whichever indicator (single- or multi-word) makes the whole sentence most grammatical — no bias toward length.
3. Do NOT use unless unavoidable: ${overused}${avoidIndicators.length > 0 ? `; also avoid: ${avoidIndicators.join(", ")}` : ""}.
4. All fodder words must appear; reorder freely; ${FODDER_PUNCTUATION_RULE}
5. ${SURFACE_MISDIRECTION_RULE}
6. At most ${MAX_LINKING_WORDS} linking words between definition and wordplay; nothing superfluous.
7. Capitalise proper names and places.
8. Set anagramIndicator to the exact phrase used (e.g. "in chaos" or "broken", whichever you chose).

EXAMPLES (decoration on the whole surface — never bracketing fodder alone)
- "Could it be a gaming plumber? That'd army, in chaos (5)"
- (On reflection, a gaming plumber — That'd army, in chaos) (5)
- A gaming plumber, That'd army, in chaos (5)
- That'd army, in chaos — a gaming plumber (5) (definition last)`;
}

export function buildIndicatorRefinePrompt(
  inspiration: string,
  answer: string,
  anagramFodder: string,
  currentClue: string,
  avoidIndicators: string[] = []
): string {
  const enumeration = answerEnumeration(answer);

  return `Improve the anagram indicator in this verified clue.

THEME / INSPIRATION
${inspiration.trim()}

${indicatorRefineRules(answer, anagramFodder, enumeration, currentClue, avoidIndicators)}

Return ONLY valid JSON:
${ANAGRAM_JSON_SCHEMA}`;
}

export function buildIndicatorRefineRepairPrompt(
  inspiration: string,
  draft: AnagramClueDraft,
  errors: string[],
  lockedAnswer: string,
  lockedFodder: string,
  currentClue: string,
  avoidIndicators: string[] = []
): string {
  const errorList = errors.map((e) => `- ${e}`).join("\n");
  const enumeration = answerEnumeration(lockedAnswer);

  return `Indicator rewrite failed verification. Fix the clue wording only.

THEME: ${inspiration.trim()}

FAILED DRAFT
${JSON.stringify(draft, null, 2)}

ERRORS
${errorList}

${indicatorRefineRules(lockedAnswer, lockedFodder, enumeration, currentClue, avoidIndicators)}

Return ONLY valid JSON:
${ANAGRAM_JSON_SCHEMA}`;
}

export function promptBundleForClient(inspiration: string) {
  return {
    setter: {
      system: ANAGRAM_SETTER_SYSTEM,
      user: buildAnagramSetterPrompt(inspiration),
    },
    repair: {
      system: ANAGRAM_REPAIR_SYSTEM,
      userTemplate:
        "Same as buildAnagramRepairPrompt — sent when verification fails, with the failed draft and error list inserted.",
    },
  };
}
