import { answerEnumeration } from "./answer-format";
import { homophoneIndicatorsForPrompt } from "./homophone-indicator-themes";
import { MAX_LINKING_WORDS } from "./clue-surface-link";
import type { AnagramClueDraft } from "./types";

export const HOMOPHONE_CLUE_SYSTEM =
  "You are an expert British cryptic crossword setter. You write homophone clues only. Reply with a single JSON object — no markdown fences, no commentary before or after.";

export const HOMOPHONE_CLUE_REPAIR_SYSTEM =
  "You fix homophone cryptic clues that failed automated verification. Reply with a single JSON object — no markdown fences, no commentary before or after.";

const HOMOPHONE_JSON_SCHEMA = `{
  "clue": "full cryptic clue ending with (N) or (N,M) for multi-word answers",
  "definition": "exact answer-side synonym phrase used in the clue",
  "homophoneHint": "exact fodder-side synonym phrase used in the clue",
  "anagramIndicator": "exact homophone indicator phrase used (on the fodder side only)",
  "rationale": "one brief sentence on synonym and indicator choices"
}`;

export interface HomophoneCluePromptInput {
  answer: string;
  fodder: string;
  answerDefinition: string;
  fodderDefinition: string;
  answerSynonyms: string[];
  fodderSynonyms: string[];
  avoidIndicators?: string[];
  preferIndicators?: string[];
  hotIndicators?: string[];
  archiveCounts?: Map<string, number>;
  shuffleSeed?: string;
}

export function buildHomophoneCluePrompt(input: HomophoneCluePromptInput): string {
  const enumeration = answerEnumeration(input.answer);
  const indicators = homophoneIndicatorsForPrompt({
    avoid: input.avoidIndicators ?? [],
    prefer: input.preferIndicators,
    hot: input.hotIndicators,
    archiveCounts: input.archiveCounts,
    seed: input.shuffleSeed,
  });
  const answerSynonymList = input.answerSynonyms
    .slice(0, 20)
    .map((s) => `- ${s}`)
    .join("\n");
  const fodderSynonymList = input.fodderSynonyms
    .slice(0, 20)
    .map((s) => `- ${s}`)
    .join("\n");

  return `Write exactly ONE British cryptic crossword clue. It must be a homophone clue.

ANSWER (solution): ${input.answer}
HOMOPHONE FODDER (sounds like answer, different spelling): ${input.fodder}

DICTIONARY SENSES
Answer (${input.answer}): ${input.answerDefinition}
Fodder (${input.fodder}): ${input.fodderDefinition}

ANSWER SYNONYMS — pick ONE for the definition side (never use the literal answer word):
${answerSynonymList || "(none — use a fair dictionary sense)"}

FODDER SYNONYMS — pick ONE for the homophone side (never use the literal fodder word):
${fodderSynonymList || "(none — use a fair dictionary sense)"}

HOMOPHONE INDICATORS — pick ONE that best matches the clue tone and surface:
${indicators}

CLUE STRUCTURE (mandatory)
1. Prefer this order with LITTLE OR NO punctuation: [fodder synonym] [indicator] [answer synonym] ${enumeration}
   Example shape: "Bin reportedly bread (4)" — indicator sits mid-clue, not trailing.
2. The indicator must appear AFTER the fodder synonym (homophone side), and should NOT be the last words before the enumeration when another fair wording exists.
3. Avoid trailing endings like ", we hear" / "so we hear" at the end of the clue.
4. Prefer zero commas, dashes, or colons. A single light join word (for / as / from) is fine.
5. Never write "${input.answer}" or "${input.fodder}" literally in the clue — use synonyms only.
6. Enumeration: ${enumeration}
7. At most ${MAX_LINKING_WORDS} linking words between halves.
8. British English spelling and idiom.
9. Vary the indicator — do not default to "we hear".

EXAMPLE (answer=CASH, fodder=cache)
Good: "Bin reportedly bread (4)"
- fodder hint "Bin" → cache
- indicator "reportedly" mid-clue
- definition "bread" → cash
Also good: "Bread from bin on the radio (4)"
Avoid: "Bread bin, we hear (4)" (trailing overused indicator + comma)

SELF-CHECK before responding
- Definition synonym matches answer sense; fodder synonym matches homophone word sense.
- Indicator is from the list above, after the fodder synonym, preferably mid-clue.
- Little or no punctuation in the surface.
- Neither literal homophone word appears in the surface.
- Clue ends with correct enumeration ${enumeration}.

Return ONLY valid JSON:
${HOMOPHONE_JSON_SCHEMA}`;
}

export function buildHomophoneClueRepairPrompt(
  input: HomophoneCluePromptInput,
  draft: AnagramClueDraft,
  errors: string[]
): string {
  const errorList = errors.map((e) => `- ${e}`).join("\n");

  return `${buildHomophoneCluePrompt(input)}

This homophone clue FAILED automated verification. Fix it so every check passes.

FAILED DRAFT
${JSON.stringify(draft, null, 2)}

ERRORS
${errorList}

Keep answer=${input.answer} and homophoneFodder=${input.fodder} locked. You may change clue wording, synonym choices, and indicator.
Prefer a mid-clue indicator with little/no punctuation (not a trailing "we hear").

Return ONLY valid JSON:
${JSON.stringify(
  {
    clue: "corrected clue",
    definition: "answer synonym used",
    homophoneHint: "fodder synonym used",
    anagramIndicator: "indicator phrase",
    rationale: "brief fix note",
  },
  null,
  2
)}`;
}
