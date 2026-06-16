import { answerLengthBounds } from "./anagram-difficulty";
import { normalizeAnswer } from "./answer-format";
import { prepareAnagramClue, verifyAnagramClue } from "./anagram-engine";
import { applyExplanationCapitalizationToClue } from "./clue-capitalization-align";
import { listCandidatePairs, defaultMaxAnswersToProcess, type AnagramPair, type PairSearchOptions } from "./anagram-dictionary";
import { buildProgrammaticClue } from "./anagram-fallback-clue";
import { usedIndicatorsFromClues } from "./anagram-indicators";
import {
  buildGenerationExcludeList,
  filterExcludedPairs,
  isAnswerExcluded,
  usedAnswersFromClues,
} from "./generation-exclude";
import {
  ANAGRAM_ANSWER_LIST_SYSTEM,
  ANAGRAM_PAIR_SELECT_SYSTEM,
  ANAGRAM_TEMPLATE_POLISH_SYSTEM,
  buildAnagramAnswerListPrompt,
  buildPairSelectPrompt,
  buildTemplatePolishPrompt,
  buildTemplatePolishRepairPrompt,
  buildIndicatorRefinePrompt,
  buildIndicatorRefineRepairPrompt,
  ANAGRAM_INDICATOR_REFINE_SYSTEM,
  ANAGRAM_SETTER_SYSTEM,
  buildAnagramSetterPrompt,
} from "./anagram-prompts";
import { buildAnswerContext } from "./answer-context";
import { buildClueSurfaceExplanation } from "./clue-surface-explain";
import { anthropicChatJson, parseModelJson } from "./llm";
import { setterModel } from "./models";
import type {
  AnagramClueDraft,
  AnagramClueResult,
  AnagramDifficulty,
  AnagramRequest,
  AnagramStrategy,
  PromptTurn,
  UsedAnagramClue,
} from "./types";

const MAX_PAIRS_TO_TRY = 32;
const INITIAL_PAIR_POOL = 48;
const RETRY_PAIR_POOL_BASE = 64;
const MAX_POLISH_ATTEMPTS = 2;

const PIPELINE_BUDGET_MS = 150_000;
const LLM_TIMEOUT_MS = 35_000;

const MAX_INDICATOR_REFINE_ATTEMPTS = 2;

interface PipelineContext {
  apiKey: string;
  inspiration: string;
  autoThemed: boolean;
  suggestedAnswers: string[];
  difficulty: AnagramDifficulty;
  bounds: ReturnType<typeof answerLengthBounds>;
  exclude: UsedAnagramClue[];
  avoidIndicators: string[];
  setterPrompt: string;
  repairPrompts: PromptTurn[];
  surfacePrompts: PromptTurn[];
  answerPrompts: PromptTurn[];
  pairSelectPrompts: PromptTurn[];
  templatePolishPrompts: PromptTurn[];
  indicatorRefinePrompts: PromptTurn[];
  llmCalls: number;
  deadlineAt: number;
  usedClaudeRanking: boolean;
}

function lockPairDraft(
  draft: AnagramClueDraft,
  pair: AnagramPair
): AnagramClueDraft {
  return prepareAnagramClue({
    ...draft,
    answer: pair.answer,
    anagramFodder: pair.fodder,
  });
}

function hasPipelineTime(ctx: PipelineContext): boolean {
  return Date.now() < ctx.deadlineAt;
}

async function callClaude(
  ctx: PipelineContext,
  system: string,
  user: string
): Promise<string | null> {
  if (!hasPipelineTime(ctx)) return null;

  try {
    const content = await anthropicChatJson({
      apiKey: ctx.apiKey,
      model: setterModel(),
      system,
      user,
      maxTokens: 2048,
      timeoutMs: LLM_TIMEOUT_MS,
    });
    ctx.llmCalls += 1;
    return content;
  } catch {
    return null;
  }
}

function verifyOptions(ctx: PipelineContext) {
  return {
    inspiration: ctx.inspiration,
    suggestedAnswers: ctx.suggestedAnswers,
  };
}

function successResult(
  ctx: PipelineContext,
  draft: AnagramClueDraft,
  strategy: AnagramStrategy,
  attempts: number
): AnagramClueResult | null {
  const verification = verifyAnagramClue(draft, verifyOptions(ctx));
  if (!verification.ok) return null;

  return {
    inspiration: ctx.inspiration,
    autoThemed: ctx.autoThemed,
    clue: verification.prepared,
    verified: true,
    verification,
    attempts,
    strategy,
    difficulty: ctx.difficulty,
    llmCalls: ctx.llmCalls,
    prompts: {
      setter: { system: ANAGRAM_SETTER_SYSTEM, user: ctx.setterPrompt },
      repairs: ctx.repairPrompts,
      surface: ctx.surfacePrompts,
      answer: ctx.answerPrompts,
      pairSelect: ctx.pairSelectPrompts,
      templatePolish: ctx.templatePolishPrompts,
      indicatorRefine: ctx.indicatorRefinePrompts,
    },
  };
}

async function selectPairWithClaude(
  ctx: PipelineContext,
  candidates: AnagramPair[]
): Promise<AnagramPair | null> {
  if (candidates.length < 2 || !hasPipelineTime(ctx)) return null;

  const prompt = buildPairSelectPrompt(ctx.inspiration, candidates);
  ctx.pairSelectPrompts.push({
    system: ANAGRAM_PAIR_SELECT_SYSTEM,
    user: prompt,
  });

  const content = await callClaude(ctx, ANAGRAM_PAIR_SELECT_SYSTEM, prompt);
  if (!content) return null;

  const { selectedIndex } = parseModelJson<{ selectedIndex?: number }>(content);
  if (
    typeof selectedIndex !== "number" ||
    selectedIndex < 0 ||
    selectedIndex >= candidates.length
  ) {
    return null;
  }

  ctx.usedClaudeRanking = true;
  return candidates[selectedIndex];
}

async function polishTemplate(
  ctx: PipelineContext,
  pair: AnagramPair,
  templateClue: string
): Promise<AnagramClueResult | null> {
  let draft: AnagramClueDraft | null = null;
  let verification = verifyAnagramClue(
    {
      answer: pair.answer,
      clue: templateClue,
      anagramFodder: pair.fodder,
    },
    verifyOptions(ctx)
  );

  for (let attempt = 0; attempt < MAX_POLISH_ATTEMPTS; attempt++) {
    if (!hasPipelineTime(ctx)) return null;

    if (attempt === 0) {
      const user = buildTemplatePolishPrompt(
        ctx.inspiration,
        pair.answer,
        pair.fodder,
        templateClue,
        ctx.avoidIndicators
      );
      ctx.templatePolishPrompts.push({
        system: ANAGRAM_TEMPLATE_POLISH_SYSTEM,
        user,
      });
      const content = await callClaude(
        ctx,
        ANAGRAM_TEMPLATE_POLISH_SYSTEM,
        user
      );
      if (!content) break;
      draft = lockPairDraft(parseModelJson<AnagramClueDraft>(content), pair);
    } else if (draft) {
      const user = buildTemplatePolishRepairPrompt(
        ctx.inspiration,
        draft,
        verification.errors,
        pair.answer,
        pair.fodder,
        templateClue,
        ctx.avoidIndicators
      );
      ctx.templatePolishPrompts.push({
        system: ANAGRAM_TEMPLATE_POLISH_SYSTEM,
        user,
      });
      const content = await callClaude(
        ctx,
        ANAGRAM_TEMPLATE_POLISH_SYSTEM,
        user
      );
      if (!content) break;
      draft = lockPairDraft(parseModelJson<AnagramClueDraft>(content), pair);
    }

    if (!draft) break;

    verification = verifyAnagramClue(draft, verifyOptions(ctx));
    if (verification.ok) {
      const strategy: AnagramStrategy = ctx.usedClaudeRanking
        ? "claude-ranked-pair"
        : "template-polish";
      return successResult(ctx, verification.prepared, strategy, attempt + 1);
    }
    draft = verification.prepared;
  }

  return null;
}

async function refineIndicatorSurface(
  ctx: PipelineContext,
  pair: AnagramPair,
  base: AnagramClueDraft
): Promise<AnagramClueResult | null> {
  let draft: AnagramClueDraft | null = null;
  let verification = verifyAnagramClue(base, verifyOptions(ctx));

  for (let attempt = 0; attempt < MAX_INDICATOR_REFINE_ATTEMPTS; attempt++) {
    if (!hasPipelineTime(ctx)) return null;

    if (attempt === 0) {
      const user = buildIndicatorRefinePrompt(
        ctx.inspiration,
        pair.answer,
        base.anagramFodder,
        base.clue,
        ctx.avoidIndicators
      );
      ctx.indicatorRefinePrompts.push({
        system: ANAGRAM_INDICATOR_REFINE_SYSTEM,
        user,
      });
      const content = await callClaude(
        ctx,
        ANAGRAM_INDICATOR_REFINE_SYSTEM,
        user
      );
      if (!content) return null;
      draft = lockPairDraft(parseModelJson<AnagramClueDraft>(content), pair);
    } else if (draft) {
      const user = buildIndicatorRefineRepairPrompt(
        ctx.inspiration,
        draft,
        verification.errors,
        pair.answer,
        pair.fodder,
        base.clue,
        ctx.avoidIndicators
      );
      ctx.indicatorRefinePrompts.push({
        system: ANAGRAM_INDICATOR_REFINE_SYSTEM,
        user,
      });
      const content = await callClaude(
        ctx,
        ANAGRAM_INDICATOR_REFINE_SYSTEM,
        user
      );
      if (!content) return null;
      draft = lockPairDraft(parseModelJson<AnagramClueDraft>(content), pair);
    }

    if (!draft) return null;

    verification = verifyAnagramClue(draft, verifyOptions(ctx));
    if (verification.ok) {
      return successResult(
        ctx,
        verification.prepared,
        "indicator-refine",
        attempt + 1
      );
    }
    draft = verification.prepared;
  }

  return null;
}

async function maybeRefineIndicator(
  ctx: PipelineContext,
  pair: AnagramPair,
  result: AnagramClueResult
): Promise<AnagramClueResult> {
  if (!hasPipelineTime(ctx)) return result;

  const refined = await refineIndicatorSurface(ctx, pair, result.clue);
  if (!refined) return result;
  return refined;
}

async function generateFromPairs(
  ctx: PipelineContext,
  pairs: AnagramPair[]
): Promise<AnagramClueResult | null> {
  const exclude = ctx.exclude;
  let ordered = pairs;

  const ranked = await selectPairWithClaude(ctx, pairs.slice(0, MAX_PAIRS_TO_TRY));
  if (ranked) {
    ordered = [
      ranked,
      ...pairs.filter(
        (p) =>
          p.answer !== ranked.answer ||
          p.fodder !== ranked.fodder
      ),
    ];
  }

  const maxTry = Math.max(MAX_PAIRS_TO_TRY, pairs.length);

  for (const pair of ordered.slice(0, maxTry)) {
    if (isAnswerExcluded(pair.answer, exclude)) continue;

    const template = buildProgrammaticClue(pair, ctx.inspiration, {
      avoidIndicators: ctx.avoidIndicators,
      suggestedAnswers: ctx.suggestedAnswers,
    });
    if (!template) continue;

    const plainStrategy: AnagramStrategy = ctx.usedClaudeRanking
      ? "claude-ranked-pair"
      : "programmatic-surface";
    const plain = successResult(ctx, template, plainStrategy, 1);
    if (!plain || isAnswerExcluded(plain.clue.answer, exclude)) {
      continue;
    }

    if (hasPipelineTime(ctx)) {
      const polished = await polishTemplate(ctx, pair, template.clue);
      if (polished && !isAnswerExcluded(polished.clue.answer, exclude)) {
        const refined = await maybeRefineIndicator(ctx, pair, polished);
        if (!isAnswerExcluded(refined.clue.answer, exclude)) {
          return refined;
        }
      }

      const refinedPlain = await maybeRefineIndicator(ctx, pair, plain);
      if (!isAnswerExcluded(refinedPlain.clue.answer, exclude)) {
        return refinedPlain;
      }
    }

    return plain;
  }

  return null;
}

async function enrichWithAnswerContext(
  ctx: PipelineContext,
  result: AnagramClueResult
): Promise<AnagramClueResult> {
  if (!hasPipelineTime(ctx)) return result;

  const remainingMs = ctx.deadlineAt - Date.now();
  if (remainingMs < 20_000) return result;

  const [answerEnriched, surfaceEnriched] = await Promise.all([
    buildAnswerContext(ctx.apiKey, result.clue.answer, ctx.inspiration),
    buildClueSurfaceExplanation(ctx.apiKey, result.clue, ctx.inspiration),
  ]);

  if (answerEnriched) {
    ctx.llmCalls += answerEnriched.llmCalls;
  }
  ctx.llmCalls += surfaceEnriched.llmCalls;

  const alignedClue = prepareAnagramClue({
    ...result.clue,
    clue: applyExplanationCapitalizationToClue(
      result.clue.clue,
      surfaceEnriched.explanation
    ),
  });

  return {
    ...result,
    clue: alignedClue,
    answerContext: answerEnriched?.context,
    surfaceExplanation: surfaceEnriched.explanation,
    llmCalls: ctx.llmCalls,
  };
}

export interface AnagramPipelineFailure {
  error: string;
  llmCalls: number;
}

async function suggestThemeAnswers(ctx: PipelineContext): Promise<string[]> {
  if (!hasPipelineTime(ctx)) return [];

  const excludedAnswers = usedAnswersFromClues(ctx.exclude);
  const user = buildAnagramAnswerListPrompt(
    ctx.inspiration,
    ctx.bounds,
    excludedAnswers
  );
  ctx.answerPrompts.push({
    system: ANAGRAM_ANSWER_LIST_SYSTEM,
    user,
  });

  const content = await callClaude(ctx, ANAGRAM_ANSWER_LIST_SYSTEM, user);
  if (!content) return [];

  const parsed = parseModelJson<{ answers?: string[] }>(content);
  const excludeSet = new Set(excludedAnswers.map((a) => normalizeAnswer(a)));
  return (parsed.answers ?? []).filter(
    (a): a is string =>
      typeof a === "string" &&
      a.length > 0 &&
      !excludeSet.has(normalizeAnswer(a))
  );
}

function pairPoolLimit(excludeCount: number, hard: boolean): number {
  if (excludeCount === 0) return hard ? 56 : INITIAL_PAIR_POOL;
  const base = hard ? 56 : 40;
  return Math.min(hard ? 96 : 72, base + excludeCount * (hard ? 14 : 12));
}

function pairSearchDepth(
  ctx: PipelineContext,
  isRetry: boolean
): Pick<
  PairSearchOptions,
  "dictionaryScanLimit" | "maxAnswersToProcess" | "skipDictionaryScan"
> {
  const hard = ctx.difficulty === "hard";
  const excludeCount = ctx.exclude.length;

  if (!isRetry) {
    return {
      skipDictionaryScan: false,
      dictionaryScanLimit: hard ? 120 : 80,
      maxAnswersToProcess: hard ? 48 : 32,
    };
  }

  return {
    skipDictionaryScan: false,
    dictionaryScanLimit: hard ? 180 : 120,
    maxAnswersToProcess:
      defaultMaxAnswersToProcess(ctx.bounds, excludeCount) + (hard ? 12 : 0),
  };
}

function searchCandidatePairs(
  ctx: PipelineContext,
  bounds: ReturnType<typeof answerLengthBounds>,
  suggestedAnswers: string[],
  excludedAnswers: string[],
  searchOptions: Partial<PairSearchOptions> = {}
): AnagramPair[] {
  const isRetry = ctx.exclude.length > 0;
  const hard = ctx.difficulty === "hard";
  const limit = pairPoolLimit(ctx.exclude.length, hard);
  const depth = pairSearchDepth(ctx, isRetry);
  return filterExcludedPairs(
    listCandidatePairs(ctx.inspiration, bounds, limit, {
      suggestedAnswers,
      excludeAnswers: excludedAnswers,
      ...depth,
      ...searchOptions,
    }),
    ctx.exclude
  );
}

export interface GenerateAnagramOptions {
  autoThemed?: boolean;
}

export async function generateVerifiedAnagramClue(
  apiKey: string,
  req: AnagramRequest,
  options: GenerateAnagramOptions = {}
): Promise<AnagramClueResult | AnagramPipelineFailure> {
  const difficulty = req.difficulty === "hard" ? "hard" : "easy";
  const bounds = answerLengthBounds(difficulty);
  const inspiration = req.inspiration.trim();
  const autoThemed = options.autoThemed === true;
  const exclude = buildGenerationExcludeList(inspiration, req.exclude ?? []);

  const ctx: PipelineContext = {
    apiKey,
    inspiration,
    autoThemed,
    suggestedAnswers: [],
    difficulty,
    bounds,
    exclude,
    avoidIndicators: usedIndicatorsFromClues(exclude),
    setterPrompt: buildAnagramSetterPrompt(inspiration),
    repairPrompts: [],
    surfacePrompts: [],
    answerPrompts: [],
    pairSelectPrompts: [],
    templatePolishPrompts: [],
    indicatorRefinePrompts: [],
    llmCalls: 0,
    deadlineAt: Date.now() + PIPELINE_BUDGET_MS,
    usedClaudeRanking: false,
  };

  const excludedAnswers = usedAnswersFromClues(exclude);
  const suggestedAnswers = await suggestThemeAnswers(ctx);
  ctx.suggestedAnswers = suggestedAnswers;

  const pairs = searchCandidatePairs(
    ctx,
    bounds,
    suggestedAnswers,
    excludedAnswers
  );

  if (pairs.length === 0) {
    return {
      error:
        exclude.length > 0
          ? "No more unused answers are available for this inspiration — try a broader theme or Restart."
          : "No valid anagram pair could be found for this inspiration.",
      llmCalls: ctx.llmCalls,
    };
  }

  const result = await generateFromPairs(ctx, pairs);
  if (result) return enrichWithAnswerContext(ctx, result);

  const timedOut = !hasPipelineTime(ctx);
  return {
    error: timedOut
      ? "Generation timed out. Check your connection and try again."
      : `Could not build a verified clue from ${pairs.length} candidate pair(s). Many themed names lack valid anagram fodder — try a shorter inspiration or rephrase the theme.`,
    llmCalls: ctx.llmCalls,
  };
}
