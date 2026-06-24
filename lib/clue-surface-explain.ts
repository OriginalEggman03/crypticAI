import type { ClaudeCallRecorder } from "./claude-trace";
import { anthropicChatJson, parseModelJson } from "./llm";
import { explainModel } from "./models";
import {
  extractDefinitionPhrase,
  extractWordplayPhrase,
  linkingWordCount,
} from "./clue-surface-link";
import type { AnagramClueDraft, ClueSurfaceExplanation } from "./types";

const EXPLAIN_SYSTEM =
  "You explain British cryptic anagram clues for solvers. Reply with a single JSON object — no markdown fences, no commentary.";

function fallbackExplanation(clue: AnagramClueDraft): ClueSurfaceExplanation {
  const definition = extractDefinitionPhrase(
    clue.clue,
    clue.anagramFodder,
    clue.anagramIndicator
  );
  const wordplay = extractWordplayPhrase(
    clue.clue,
    clue.anagramFodder,
    clue.anagramIndicator
  );
  const linkCount = linkingWordCount(clue.clue, clue.anagramFodder);

  return {
    definition,
    wordplay,
    linkingWords:
      linkCount === 0
        ? "None — definition runs straight into the wordplay."
        : `${linkCount} linking word${linkCount === 1 ? "" : "s"} before the fodder.`,
    walkthrough: `The definition "${definition}" leads to ${clue.answer}. The wordplay uses "${clue.anagramFodder}" with the anagram indicator "${clue.anagramIndicator ?? "in the clue"}" — those letters rearrange to give ${clue.answer}.`,
  };
}

export async function buildClueSurfaceExplanation(
  apiKey: string,
  clue: AnagramClueDraft,
  inspiration: string,
  recordCall?: ClaudeCallRecorder
): Promise<{ explanation: ClueSurfaceExplanation; llmCalls: number }> {
  const fallback = fallbackExplanation(clue);

  try {
    const user = `Explain this verified anagram clue so a solver understands how the surface reads.

INSPIRATION / THEME
${inspiration.trim()}

CLUE
${clue.clue}

ANSWER
${clue.answer}

ANAGRAM FODDER (exact words in clue — any order)
${clue.anagramFodder}

ANAGRAM INDICATOR
${clue.anagramIndicator ?? "(identify from clue)"}

Write a clear breakdown:
1. Which part is the definition (what the clue is pointing at as the answer).
2. Which part is the wordplay (fodder + indicator + how letters rearrange).
3. Any linking words between definition and wordplay (0–3 allowed; fewer is better).
4. A short walkthrough of how the clue reads as a sentence and why it works.

Quote the definition and wordplay phrases exactly as they appear in the clue surface, preserving capitalization (e.g. "Jonahs town" not "jonahs town" when a name is present).

Return ONLY valid JSON:
{
  "definition": "quoted definition phrase from the clue",
  "wordplay": "quoted wordplay phrase from the clue",
  "linkingWords": "brief note on connectors, or 'none'",
  "walkthrough": "2–4 sentences explaining the surface"
}`;
    const content = await anthropicChatJson({
      apiKey,
      model: explainModel(),
      system: EXPLAIN_SYSTEM,
      user,
      maxTokens: 768,
      timeoutMs: 25_000,
    });
    recordCall?.("Clue surface explanation", EXPLAIN_SYSTEM, user, content);

    const parsed = parseModelJson<{
      definition?: string;
      wordplay?: string;
      linkingWords?: string;
      walkthrough?: string;
    }>(content);

    if (parsed.definition?.trim() && parsed.walkthrough?.trim()) {
      return {
        explanation: {
          definition: parsed.definition.trim(),
          wordplay: parsed.wordplay?.trim() || fallback.wordplay,
          linkingWords: parsed.linkingWords?.trim() || fallback.linkingWords,
          walkthrough: parsed.walkthrough.trim(),
        },
        llmCalls: 1,
      };
    }
  } catch {
    // use fallback
  }

  return { explanation: fallback, llmCalls: 0 };
}
