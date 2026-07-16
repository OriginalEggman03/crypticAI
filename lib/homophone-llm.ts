import { answerEnumeration } from "./answer-format";
import { getStoredHomophoneDefinition } from "./db/homophones";
import { prepareHomophoneClue, verifyHomophoneClue } from "./homophone-engine";
import { gatherHomophoneSynonymsLocal } from "./homophone-synonym-populate";
import {
  buildHomophoneCluePrompt,
  buildHomophoneClueRepairPrompt,
  HOMOPHONE_CLUE_REPAIR_SYSTEM,
  HOMOPHONE_CLUE_SYSTEM,
  type HomophoneCluePromptInput,
} from "./homophone-prompts";
import type { HomophonePair } from "./homophone-dictionary";
import { anthropicChatJson, parseModelJson } from "./llm";
import { setterModel } from "./models";
import type { AnagramClueDraft, ClaudeCallTrace } from "./types";

const LLM_TIMEOUT_MS = 35_000;
const MAX_REPAIR_ATTEMPTS = 2;

interface HomophoneLlmResult {
  draft: AnagramClueDraft | null;
  llmCalls: number;
  claudeTrace: ClaudeCallTrace[];
}

function lockPairDraft(
  parsed: Partial<AnagramClueDraft>,
  pair: HomophonePair
): AnagramClueDraft {
  return {
    answer: pair.answer,
    anagramFodder: pair.fodder,
    clue: parsed.clue?.trim() ?? "",
    definition: parsed.definition?.trim(),
    homophoneHint: parsed.homophoneHint?.trim(),
    anagramIndicator: parsed.anagramIndicator?.trim(),
  };
}

function definitionForWord(word: string): string {
  const stored = getStoredHomophoneDefinition(word);
  if (stored?.definition) {
    const pos = stored.partOfSpeech ? ` (${stored.partOfSpeech})` : "";
    return `${stored.definition}${pos}`;
  }
  return `British English word: ${word}`;
}

export function buildHomophoneCluePromptInput(
  pair: HomophonePair,
  answerSynonyms: string[],
  fodderSynonyms: string[],
  options: {
    avoidIndicators?: string[];
    preferIndicators?: string[];
    hotIndicators?: string[];
    archiveCounts?: Map<string, number>;
    shuffleSeed?: string;
  } = {}
): HomophoneCluePromptInput {
  return {
    answer: pair.answer,
    fodder: pair.fodder,
    answerDefinition: definitionForWord(pair.answer),
    fodderDefinition: definitionForWord(pair.fodder),
    answerSynonyms:
      answerSynonyms.length > 0
        ? answerSynonyms
        : gatherHomophoneSynonymsLocal(pair.answer),
    fodderSynonyms:
      fodderSynonyms.length > 0
        ? fodderSynonyms
        : gatherHomophoneSynonymsLocal(pair.fodder),
    avoidIndicators: options.avoidIndicators,
    preferIndicators: options.preferIndicators,
    hotIndicators: options.hotIndicators,
    archiveCounts: options.archiveCounts,
    shuffleSeed: options.shuffleSeed,
  };
}

async function callHomophoneClaude(
  apiKey: string,
  label: string,
  system: string,
  user: string,
  trace: ClaudeCallTrace[]
): Promise<string | null> {
  try {
    const content = await anthropicChatJson({
      apiKey,
      model: setterModel(),
      system,
      user,
      maxTokens: 1536,
      timeoutMs: LLM_TIMEOUT_MS,
    });
    trace.push({
      order: trace.length + 1,
      label,
      system,
      user,
      response: content,
    });
    return content;
  } catch {
    trace.push({
      order: trace.length + 1,
      label,
      system,
      user,
    });
    return null;
  }
}

export async function generateHomophoneClueWithClaude(
  apiKey: string,
  pair: HomophonePair,
  options: {
    answerSynonyms?: string[];
    fodderSynonyms?: string[];
    avoidIndicators?: string[];
    preferIndicators?: string[];
    hotIndicators?: string[];
    archiveCounts?: Map<string, number>;
    shuffleSeed?: string;
  } = {}
): Promise<HomophoneLlmResult> {
  const trace: ClaudeCallTrace[] = [];
  let llmCalls = 0;

  const promptInput = buildHomophoneCluePromptInput(
    pair,
    options.answerSynonyms ?? [],
    options.fodderSynonyms ?? [],
    {
      avoidIndicators: options.avoidIndicators,
      preferIndicators: options.preferIndicators,
      hotIndicators: options.hotIndicators,
      archiveCounts: options.archiveCounts,
      shuffleSeed: options.shuffleSeed,
    }
  );

  if (
    promptInput.answerSynonyms.length === 0 ||
    promptInput.fodderSynonyms.length === 0
  ) {
    return { draft: null, llmCalls: 0, claudeTrace: trace };
  }

  let draft: AnagramClueDraft | null = null;
  let verification = verifyHomophoneClue(
    prepareHomophoneClue({
      answer: pair.answer,
      clue: "",
      anagramFodder: pair.fodder,
    })
  );

  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    const isRepair = attempt > 0;
    const user = isRepair && draft
      ? buildHomophoneClueRepairPrompt(promptInput, draft, verification.errors)
      : buildHomophoneCluePrompt(promptInput);

    const content = await callHomophoneClaude(
      apiKey,
      isRepair ? "Homophone clue repair" : "Homophone clue",
      isRepair ? HOMOPHONE_CLUE_REPAIR_SYSTEM : HOMOPHONE_CLUE_SYSTEM,
      user,
      trace
    );
    if (!content) break;
    llmCalls += 1;

    const parsed = parseModelJson<AnagramClueDraft & { rationale?: string }>(
      content
    );
    draft = lockPairDraft(parsed, pair);

    if (!draft.clue) break;
    if (!draft.clue.includes(answerEnumeration(pair.answer))) {
      draft = {
        ...draft,
        clue: draft.clue.replace(/\(\d+(?:,\d+)*\)\s*$/, "").trim()
          + ` ${answerEnumeration(pair.answer)}`,
      };
    }

    verification = verifyHomophoneClue(prepareHomophoneClue(draft));
    if (verification.ok) {
      return {
        draft: verification.prepared,
        llmCalls,
        claudeTrace: trace,
      };
    }
    draft = verification.prepared;
  }

  return { draft: null, llmCalls, claudeTrace: trace };
}
