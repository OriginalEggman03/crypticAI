import { MAX_LINKING_WORDS } from "./clue-surface-link";
import { DEFINITION_THEME_CRAFT_RULE } from "./definition-quality";
import { SURFACE_BLEND_RULE } from "./clue-surface-blend";

export { SURFACE_BLEND_RULE } from "./clue-surface-blend";
export const FODDER_GAP_CHARACTERS =
  "spaces, commas, full stops, question marks, exclamation marks, colons, semi-colons, dashes, apostrophes";

/** Shared fodder punctuation guidance for prompts and verification copy. */
export const FODDER_PUNCTUATION_RULE =
  `Use ${FODDER_GAP_CHARACTERS} between fodder words when that makes the surface smoother and more grammatical (e.g. That'd army, in chaos or Army? That'd — broken). Only that punctuation may sit between fodder words — never extra linking words. Do NOT wrap individual fodder words in quotation marks, parentheses, or italics — that marks the wordplay for the solver.`;

/** Shared surface-craft rules for Claude polish / refine prompts. */
export function surfaceCraftRules(options: {
  answer: string;
  anagramFodder: string;
  enumeration: string;
  indicatorRuleNum?: number;
  extraRules?: string[];
}): string {
  const { answer, anagramFodder, enumeration, extraRules = [] } = options;
  let ruleNum = options.indicatorRuleNum ?? 10;

  const extraLines = extraRules
    .map((text) => {
      const line = `\n${ruleNum}. ${text}`;
      ruleNum += 1;
      return line;
    })
    .join("");

  return `SURFACE CRAFT (make the clue harder and more interesting — tight broadsheet style)
1. Definition first OR definition last — choose whichever reads more naturally.
2. ${DEFINITION_THEME_CRAFT_RULE}
3. Fodder words (${anagramFodder.split(/\s+/).join(", ")}) must ALL appear in the clue with exact spelling (capitalise proper names). You may reorder them. ${FODDER_PUNCTUATION_RULE}
4. Anagram indicator sits with the fodder/wordplay half (before or after the fodder cluster is fine).
5. ${SURFACE_BLEND_RULE}
6. Use at most ${MAX_LINKING_WORDS} linking words between definition and wordplay — only words that genuinely connect the two halves; ${MAX_LINKING_WORDS} is the maximum, fewer is better. Nothing superfluous: no filler, no padding, no redundant phrasing, and no extra words in the wordplay half beyond fodder and indicator.
7. End with ${enumeration}.
8. Do not write any word from ${answer} as a standalone word in the clue.
9. Pick the anagram indicator (single-word or multi-word) that makes the full sentence read most naturally — no preference for length; vary your choice and avoid overused words like "scrambled" and "muddled" unless nothing else fits.
10. Write one crisp grammatical sentence — vivid definition, natural wordplay, no wasted words. Use proper apostrophes in contractions (That'd, Don't, It's — never Thatd, Dont, Its as a contraction).${extraLines}
${ruleNum}. Set anagramIndicator in JSON to the exact indicator phrase used (e.g. "in chaos", "out of order").
${ruleNum + 1}. Capitalise the first word of the clue and the first word after any full stop, exclamation mark, or question mark, plus any names or places; all other words must be lowercase (e.g. "Perhaps John agency in chaos for a roster member (6,4)" or "Lost at sea? Help me, john! Agency in chaos (6,4)" — not "John, Agency In Chaos").`;
}
