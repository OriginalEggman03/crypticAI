import {
  DEFINITION_THEME_CRAFT_RULE,
  isVagueDefinition,
} from "@/lib/definition-quality";
import { filterSeedsForAnswer } from "@/lib/definition-domains";
import { anthropicChatJson, parseModelJson } from "@/lib/llm";
import { setterModel } from "@/lib/models";
import type { ClaudeCallRecorder } from "@/lib/claude-trace";

export const DEFINITION_SEEDS_SYSTEM =
  "You write definition halves for British cryptic crossword clues. Reply with JSON only — no markdown.";

/** Minimum registry seeds before we skip the Claude fetch. */
export const MIN_REGISTRY_SEEDS_BEFORE_CLAUDE = 4;

export function buildDefinitionSeedsPrompt(inspiration: string): string {
  return `Suggest 8–10 short definition phrases for anagram cryptic clues themed on:

"${inspiration.trim()}"

Each item is the DEFINITION half only — a crisp noun phrase (3–6 words) such as "A grass-court champion" or "A spymaster's adversary".

RULES
1. ${DEFINITION_THEME_CRAFT_RULE}
2. Every phrase must start with "A" or "An".
3. Anchor each phrase in this specific inspiration's world — not generic crossword filler.
4. Vary wording; no duplicates.

Return ONLY valid JSON:
{ "seeds": ["A ...", "An ...", ...] }`;
}

function normalizeSeedPhrase(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  if (isVagueDefinition(trimmed)) return null;
  if (!/^a(n)?\s/i.test(trimmed)) {
    const withArticle = /^[aeiou]/i.test(trimmed) ? `An ${trimmed}` : `A ${trimmed}`;
    if (isVagueDefinition(withArticle)) return null;
    return withArticle;
  }
  return trimmed;
}

export async function fetchClaudeDefinitionSeeds(
  apiKey: string,
  inspiration: string,
  recordCall?: ClaudeCallRecorder
): Promise<string[]> {
  const user = buildDefinitionSeedsPrompt(inspiration);
  let content: string | null = null;

  try {
    content = await anthropicChatJson({
      apiKey,
      model: setterModel(),
      system: DEFINITION_SEEDS_SYSTEM,
      user,
      maxTokens: 768,
      timeoutMs: 25_000,
    });
  } catch {
    recordCall?.("Definition seed cache", DEFINITION_SEEDS_SYSTEM, user, null);
    return [];
  }

  recordCall?.("Definition seed cache", DEFINITION_SEEDS_SYSTEM, user, content);

  const parsed = parseModelJson<{ seeds?: string[] }>(content);
  const seen = new Set<string>();
  const seeds: string[] = [];

  for (const raw of parsed.seeds ?? []) {
    const phrase = normalizeSeedPhrase(raw);
    if (!phrase) continue;
    const key = phrase.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    seeds.push(phrase);
  }

  return seeds;
}

export function claudeSeedsForAnswer(
  seeds: string[],
  answer: string
): string[] {
  return filterSeedsForAnswer(seeds, answer);
}
