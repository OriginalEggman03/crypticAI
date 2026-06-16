export const CLUE_TYPE_OPTIONS = [
  { value: "all", label: "All (mixed)" },
  { value: "double-definition", label: "Double definition" },
  { value: "triple-definition", label: "Triple definition" },
  { value: "homophone", label: "Homophone" },
  { value: "anagram", label: "Anagram" },
  { value: "andlit", label: "&lit" },
  { value: "cryptic-definition", label: "Cryptic definition" },
  { value: "hidden", label: "Hidden" },
  { value: "reverse-hidden", label: "Reverse hidden" },
] as const;

export type ClueTypeOption = (typeof CLUE_TYPE_OPTIONS)[number]["value"];

const MIXED_TYPES_LIST = CLUE_TYPE_OPTIONS.filter((o) => o.value !== "all")
  .map((o) => o.label)
  .join(", ");

const TYPE_RULES: Record<Exclude<ClueTypeOption, "all">, string> = {
  "double-definition":
    "Every clue MUST be a double definition: two independent definitions of the answer, joined smoothly (often with 'and' or a comma). No separate anagram/hidden wordplay.",
  "triple-definition":
    "Every clue MUST be a triple definition: three independent definitions of the answer in one clue. No separate anagram/hidden wordplay.",
  homophone:
    "Every clue MUST be a homophone: one part defines the answer, another part is a word or phrase that sounds like the answer when spoken. Include a fair homophone indicator (e.g. 'we hear', 'say', 'sounds like', 'reportedly').",
  anagram:
    "Every clue MUST be an anagram: one part defines the answer, another part contains anagram fodder plus a fair anagram indicator (e.g. 'broken', 'muddled', 'new'). The fodder letters rearrange to form the answer.",
  andlit:
    "Every clue MUST be an &lit: the entire clue reads as a single literal statement that both defines AND describes the answer — no separate wordplay fragment. Often witty or self-referential.",
  "cryptic-definition":
    "Every clue MUST be a cryptic definition: a single playful or punny definition of the answer, ending with a question mark. The surface is the definition; the wordplay is embedded in the pun (no separate anagram/hidden).",
  hidden:
    "Every clue MUST be a hidden word: the answer's letters (ignoring spaces/punctuation) appear consecutively inside the clue body — often split across word boundaries. Include a fair hidden indicator (in, part of, some). Choose answers 4–7 letters where you can confirm the embedding before writing. Craft the container phrase first, verify the letter sequence, then add definition + indicator.",
  "reverse-hidden":
    "Every clue MUST be a reverse hidden: the answer reversed must appear as consecutive letters in the clue. Include hidden/reversal indicators. Confirm the reversed letter sequence is present before finalising.",
};

export function buildClueTypeRequirement(clueType: ClueTypeOption): string {
  if (clueType === "all") {
    return `CLUE TYPE: Mixed (All)
- Use a varied mixture across the ${MIXED_TYPES_LIST} types.
- Each clue must use exactly ONE primary type from that list.
- Spread types evenly; avoid using the same type more than twice unless necessary.
- Do not default every clue to anagram — aim for genuine variety.`;
  }

  const label =
    CLUE_TYPE_OPTIONS.find((o) => o.value === clueType)?.label ?? clueType;

  return `CLUE TYPE: ${label} (mandatory for every clue)
- ${TYPE_RULES[clueType]}
- Every single clue in the puzzle must conform to this type. Do not mix in other clue types.`;
}

export function buildCriticClueTypeRules(clueType: ClueTypeOption): string {
  if (clueType === "all") {
    return `8. **Clue type variety**: each clue must be a fair example of one of: ${MIXED_TYPES_LIST}. Reject clues that do not clearly fit one of these types or that lazily repeat the same device for most of the puzzle.`;
  }

  return `8. **Clue type conformity**: EVERY clue must strictly match the required type "${CLUE_TYPE_OPTIONS.find((o) => o.value === clueType)?.label}". Reject and rewrite any clue using a different technique.`;
}
