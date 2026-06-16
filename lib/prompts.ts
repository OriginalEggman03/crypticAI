import type { GenerateResponse, UserPreferences } from "./types";
import type { VerificationFailure } from "./clue-verify";
import { failureRepairHint } from "./clue-verify";
import {
  buildClueTypeRequirement,
  buildCriticClueTypeRules,
  type ClueTypeOption,
} from "./clue-types";

function resolveClueType(clueType?: string): ClueTypeOption {
  return (clueType ?? "all") as ClueTypeOption;
}

export const WORD_COUNT = 8;

const ENTRY_SCHEMA = `"entries": [
    {
      "answer": "UPPERCASE",
      "clue": "full cryptic clue (N)",
      "clueType": "one of: double-definition | triple-definition | homophone | anagram | andlit | cryptic-definition | hidden | reverse-hidden | charade | container | etc.",
      "anagramFodder": "exact words from clue that anagram to answer, or null if not anagram"
    }
  ]`;

const MECHANICAL_RULES = `
MECHANICAL FAIRNESS (verified in code before the grid is built — failures are rejected):
- **enumeration**: bracketed length must match answer letter count.
- **no standalone answer**: the answer must not appear as a whole word in the clue (except fair hidden spans).
- **hidden**: consecutive letters in clue + hidden indicator (in, part of, some, etc.). Before writing, confirm: remove spaces/punctuation from the clue body — the answer's letters must appear in order as a contiguous substring. Prefer answers 4–7 letters that embed naturally inside a longer phrase (split across word boundaries is fine). Do NOT tag as hidden unless this check passes.
- **reverse-hidden**: reversed answer as consecutive letters + hidden/reversal indicator. Confirm the reversed letter sequence appears contiguously.
- **anagram**: anagram indicator required; anagramFodder mandatory — exact consecutive words from clue whose letters rearrange to the answer with **identical letter counts** (same length, each letter used once, no doubling).
- **homophone**: sound indicator required (we hear, reportedly, sounds like, etc.).
- **cryptic-definition**: clue must contain a question mark.
- **spelling**: clue surface must not contain obvious typos (British English); theme words from the inspiration are allowed.
- **clueType**: every entry must have an accurate clueType tag.`;

export function buildGenerationPrompt(prefs: UserPreferences): string {
  const clueType = resolveClueType(prefs.clueType);
  const clueTypeBlock = buildClueTypeRequirement(clueType);
  const hiddenLengthNote =
    clueType === "hidden" || clueType === "reverse-hidden"
      ? "\n6. **Hidden answers**: prefer 4–7 letter words. Before finalising each clue, strip spaces/punctuation and confirm the answer's letters appear consecutively in the clue body."
      : "";

  return `You are an expert British cryptic crossword setter. Create a themed mini puzzle from the solver's inspiration below.

CROSSWORD INSPIRATION
${prefs.inspiration.trim() || "(none given)"}

${clueTypeBlock}
${MECHANICAL_RULES}

REQUIREMENTS
1. Produce exactly ${WORD_COUNT} entries. Every answer MUST connect clearly to the inspiration.
2. Answers: single words in UPPERCASE; length 4–10 letters for grid fit.
3. Clues: authentic British cryptic style with length in parentheses at the end, e.g. (7).
4. Do not use the answer verbatim in the clue (hidden/reverse-hidden: answer letters must appear only as part of the hidden span, not as a standalone word).
5. Tag each entry with accurate clueType. For anagram clues, anagramFodder is mandatory.${hiddenLengthNote}

Return ONLY valid JSON (no markdown):
{
  "title": "short witty puzzle title",
  "subtitle": "one line describing the theme",
  ${ENTRY_SCHEMA}
}`;
}

export function buildCriticPrompt(
  inspiration: string,
  clueType: ClueTypeOption,
  draft: GenerateResponse
): string {
  const clueTypeRules = buildCriticClueTypeRules(clueType);
  const structureRule =
    clueType === "double-definition" ||
    clueType === "triple-definition" ||
    clueType === "cryptic-definition" ||
    clueType === "andlit"
      ? "1. **True cryptic structure**: the clue must fairly deliver the answer using the required clue type."
      : "1. **True cryptic structure**: clear definition half AND separate wordplay half.";

  return `You are a senior cryptic crossword editor. Review and revise the draft until every clue meets professional standards.

CROSSWORD INSPIRATION
${inspiration.trim()}

REQUIRED CLUE TYPE
${buildClueTypeRequirement(clueType)}
${MECHANICAL_RULES}

DRAFT PUZZLE
${JSON.stringify(draft, null, 2)}

EDITORIAL STANDARDS — reject and rewrite any clue that fails ANY check:
${structureRule}
2. **Fair wordplay** with appropriate indicators.
3. **Correct enumeration** in brackets.
4. **Surface reading** as plausible English.
5. **Theme link** to the inspiration.
6. **Type discipline**: ${clueType === "all" ? "varied mix of clue types" : "only the required clue type"}.
7. **Mechanical checks**: hidden/reverse-hidden/anagram clues MUST pass the mechanical fairness rules above.
${clueTypeRules}

Return exactly ${WORD_COUNT} entries with clueType and anagramFodder fields.

Return ONLY valid JSON:
{
  "title": "string",
  "subtitle": "string",
  ${ENTRY_SCHEMA}
}`;
}

export function buildRepairPrompt(
  inspiration: string,
  clueType: ClueTypeOption,
  puzzle: GenerateResponse,
  failures: VerificationFailure[]
): string {
  const failureList = failures
    .map(
      (f) =>
        `- Entry ${f.index + 1} (${f.answer}, check: ${f.clueType}): ${f.reason}\n  Clue: "${f.clue}"\n  FIX: ${failureRepairHint(f)}`
    )
    .join("\n\n");

  const typeChangeRule =
    clueType === "all"
      ? `- **If an answer cannot pass its tagged type**, change clueType and rewrite (e.g. failed anagram → charade or double-definition; failed hidden → anagram).
- **Anagram fodder must use exactly the same letters as the answer** — count letters before responding (MEGAMIND = 8 letters).`
      : `- **Required type is fixed (${clueType})** — do NOT change clueType. Rewrite the clue (or replace the answer with a shorter on-theme alternative) until verification passes.`;

  return `You are a cryptic crossword editor. The following clues FAILED automated verification. Rewrite the failed entries so they pass.

CROSSWORD INSPIRATION
${inspiration.trim()}

PUZZLE CONTEXT
${buildClueTypeRequirement(clueType)}
${MECHANICAL_RULES}

FULL PUZZLE (keep passing entries unchanged)
${JSON.stringify(puzzle, null, 2)}

VERIFICATION FAILURES
${failureList}

INSTRUCTIONS
- Fix every failed entry. Prefer keeping theme links.
${typeChangeRule}
- **Hidden**: the answer's letters (ignore spaces/punctuation) MUST appear consecutively in the clue body. Splitting across words is OK. Add a hidden indicator (in, part of, some).
- For anagram: set anagramFodder to exact consecutive words from the clue; letter count must match the answer exactly.
- Return the complete puzzle JSON with all ${WORD_COUNT} entries.

Return ONLY valid JSON:
{
  "title": "string",
  "subtitle": "string",
  ${ENTRY_SCHEMA}
}`;
}

export function buildFocusedHiddenRepairPrompt(
  inspiration: string,
  clueType: ClueTypeOption,
  puzzle: GenerateResponse,
  failures: VerificationFailure[]
): string {
  const hiddenFails = failures.filter(
    (f) => f.clueType === "hidden" || f.clueType === "reverse-hidden"
  );
  const checklist = hiddenFails
    .map((f) => {
      const letters = f.answer.toUpperCase().replace(/[^A-Z]/g, "");
      return `- ${f.answer}: clue letter-stream MUST contain "${letters}" consecutively (currently missing). ${failureRepairHint(f)}`;
    })
    .join("\n");

  return `URGENT: Hidden-word verification failed. Rewrite ONLY the failed entries below.

Each answer's letters must appear in order, consecutively, when you remove spaces and punctuation from the clue (excluding the final enumeration).

CHECKLIST
${checklist}

INSPIRATION: ${inspiration.trim()}
REQUIRED TYPE: ${clueType}

WORKED EXAMPLE — answer BLADE in "Extract from stable debris (5)":
Letter stream: EXTRACTFROMSTABLEDEBRIS → contains B-L-A-D-E inside STABLE.

FULL PUZZLE (keep passing entries unchanged):
${JSON.stringify(puzzle, null, 2)}

Return complete JSON with all ${WORD_COUNT} entries. ${clueType === "hidden" ? "Replace long unembeddable answers (8+ letters) with shorter on-theme alternatives if needed." : ""}
{
  "title": "string",
  "subtitle": "string",
  ${ENTRY_SCHEMA}
}`;
}

export function buildReplaceFailedEntriesPrompt(
  inspiration: string,
  clueType: ClueTypeOption,
  puzzle: GenerateResponse,
  failures: VerificationFailure[]
): string {
  const byIndex = new Map<number, VerificationFailure[]>();
  for (const f of failures) {
    const list = byIndex.get(f.index) ?? [];
    list.push(f);
    byIndex.set(f.index, list);
  }

  const replaceList = [...byIndex.entries()]
    .map(([index, fails]) => {
      const reasons = fails.map((f) => f.reason).join("; ");
      const entry = puzzle.entries[index];
      return `- Entry ${index + 1}: replace answer "${entry?.answer ?? fails[0].answer}" and clue entirely.\n  Problems: ${reasons}\n  Current clue: "${entry?.clue ?? fails[0].clue}"`;
    })
    .join("\n\n");

  return `Several clues still fail automated verification. Replace ONLY the listed entries with brand-new on-theme answers and clues that WILL pass every mechanical check.

CROSSWORD INSPIRATION
${inspiration.trim()}

${buildClueTypeRequirement(clueType)}
${MECHANICAL_RULES}

ENTRIES TO REPLACE (write completely new answer + clue for each)
${replaceList}

Keep every other entry exactly unchanged (same answer, clue, clueType, anagramFodder).

Return the complete puzzle JSON with all ${WORD_COUNT} entries.

Return ONLY valid JSON:
{
  "title": "string",
  "subtitle": "string",
  ${ENTRY_SCHEMA}
}`;
}

export const SETTER_SYSTEM =
  "You set fair British cryptic crosswords for a broadsheet. Reply with a single JSON object only — no markdown fences, no commentary before or after.";

export const CRITIC_SYSTEM =
  "You are a strict cryptic crossword editor. Reply with a single JSON object only — no markdown fences, no commentary before or after.";

export const REPAIR_SYSTEM =
  "You fix cryptic clues that failed automated verification. Reply with a single JSON object only — no markdown fences, no commentary before or after.";

export function buildExplainPrompt(
  clue: string,
  answer: string,
  clueType?: string | null,
  anagramFodder?: string | null
): string {
  const meta = [
    clueType ? `TAGGED CLUE TYPE: ${clueType}` : null,
    anagramFodder ? `ANAGRAM FODDER (from setter): ${anagramFodder}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Explain this British cryptic crossword clue for a solver who wants to learn.
Use the tagged clue type and anagram fodder below when provided — do not contradict them.

CLUE: ${clue}
ANSWER: ${answer}
${meta ? `${meta}\n` : ""}
Return ONLY valid JSON:
{
  "clueType": "primary technique name",
  "definition": "which part is the definition",
  "wordplay": "which part is wordplay and how it works",
  "parts": [
    { "text": "exact phrase from clue", "role": "definition | anagram fodder | anagram indicator | homophone indicator | hidden indicator | etc." }
  ],
  "walkthrough": "2–4 sentences reaching ${answer}"
}`;
}

export const EXPLAIN_SYSTEM =
  "You explain British cryptic crossword clues clearly. Reply with a single JSON object only — no markdown fences, no commentary before or after.";
