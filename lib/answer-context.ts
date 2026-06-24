import { answerWords, isMultiWordAnswer } from "./answer-format";
import type { ClaudeCallRecorder } from "./claude-trace";
import { anthropicChatJson, parseModelJson } from "./llm";
import { explainModel } from "./models";
import type { AnswerContext } from "./types";

interface DictionaryApiMeaning {
  partOfSpeech?: string;
  definitions?: { definition?: string }[];
}

interface DictionaryApiEntry {
  meanings?: DictionaryApiMeaning[];
}

const CONTEXT_SYSTEM =
  "You explain crossword answers. Reply with a single JSON object — no markdown fences, no commentary.";

async function lookupDictionaryDefinition(
  word: string
): Promise<{ definition: string; partOfSpeech?: string } | null> {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!normalized) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;

    const entries = (await res.json()) as DictionaryApiEntry[];
    const first = entries[0]?.meanings?.[0];
    const definition = first?.definitions?.[0]?.definition?.trim();
    if (!definition) return null;

    return {
      definition,
      partOfSpeech: first?.partOfSpeech,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildTopicRelationPrompt(
  answer: string,
  dictionaryDefinition: string,
  partOfSpeech: string | undefined,
  inspiration: string
): string {
  const pos = partOfSpeech ? ` (${partOfSpeech})` : "";

  return `The crossword answer is ${answer}${pos}.
Dictionary definition: ${dictionaryDefinition}

The user's inspiration/topics: ${inspiration.trim()}

Write one concise sentence explaining how this answer meaningfully connects to those topics.

The link must be a GENUINE thematic connection (a character, item, place, or concept from that world).
REJECT tenuous links such as spelling similarity (e.g. BADMAN because it looks like BATMAN).
If the answer is not a genuine themed entity, say so honestly rather than inventing a weak link.

Return ONLY valid JSON:
{
  "topicRelation": "your sentence here"
}`;
}

async function fetchTopicRelation(
  apiKey: string,
  answer: string,
  dictionaryDefinition: string,
  partOfSpeech: string | undefined,
  inspiration: string,
  recordCall?: ClaudeCallRecorder
): Promise<string> {
  const user = buildTopicRelationPrompt(
    answer,
    dictionaryDefinition,
    partOfSpeech,
    inspiration
  );
  const content = await anthropicChatJson({
    apiKey,
    model: explainModel(),
    system: CONTEXT_SYSTEM,
    user,
    maxTokens: 512,
    timeoutMs: 25_000,
  });
  recordCall?.("Answer context (topic link)", CONTEXT_SYSTEM, user, content);

  const parsed = parseModelJson<{ topicRelation?: string }>(content);
  return parsed.topicRelation?.trim() ?? "";
}

async function fetchDefinitionAndRelation(
  apiKey: string,
  answer: string,
  inspiration: string,
  recordCall?: ClaudeCallRecorder
): Promise<AnswerContext | null> {
  const user = `The crossword answer is ${answer}.
The user's inspiration/topics: ${inspiration.trim()}

Provide a standard British English dictionary-style definition of ${answer}, and one sentence on how it meaningfully connects to the inspiration.

The thematic link must be genuine (a real character, item, or concept from that world) — not spelling similarity or a vague association.

Return ONLY valid JSON:
{
  "dictionaryDefinition": "concise dictionary definition",
  "partOfSpeech": "noun | verb | etc. or omit",
  "topicRelation": "one sentence linking answer to inspiration"
}`;
  const content = await anthropicChatJson({
    apiKey,
    model: explainModel(),
    system: CONTEXT_SYSTEM,
    user,
    maxTokens: 768,
    timeoutMs: 25_000,
  });
  recordCall?.(
    "Answer context (definition + link)",
    CONTEXT_SYSTEM,
    user,
    content
  );

  const parsed = parseModelJson<{
    dictionaryDefinition?: string;
    partOfSpeech?: string;
    topicRelation?: string;
  }>(content);

  const dictionaryDefinition = parsed.dictionaryDefinition?.trim();
  const topicRelation = parsed.topicRelation?.trim();
  if (!dictionaryDefinition || !topicRelation) return null;

  return {
    dictionaryDefinition,
    partOfSpeech: parsed.partOfSpeech?.trim(),
    topicRelation,
  };
}

export async function buildAnswerContext(
  apiKey: string,
  answer: string,
  inspiration: string,
  recordCall?: ClaudeCallRecorder
): Promise<{ context: AnswerContext; llmCalls: number } | null> {
  const lookupWord = isMultiWordAnswer(answer) ? answerWords(answer)[0] : answer;
  const dict = await lookupDictionaryDefinition(lookupWord);

  if (dict) {
    const topicRelation = await fetchTopicRelation(
      apiKey,
      answer,
      isMultiWordAnswer(answer)
        ? `${answer} — dictionary entry for "${lookupWord}": ${dict.definition}`
        : dict.definition,
      dict.partOfSpeech,
      inspiration,
      recordCall
    );
    if (!topicRelation) return null;

    return {
      context: {
        dictionaryDefinition: isMultiWordAnswer(answer)
          ? `${answer} (${lookupWord}: ${dict.definition})`
          : dict.definition,
        partOfSpeech: dict.partOfSpeech,
        topicRelation,
      },
      llmCalls: 1,
    };
  }

  const fallback = await fetchDefinitionAndRelation(
    apiKey,
    answer,
    inspiration,
    recordCall
  );
  if (!fallback) return null;

  return { context: fallback, llmCalls: 1 };
}
