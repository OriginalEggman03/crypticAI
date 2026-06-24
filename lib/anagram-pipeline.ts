import { answerLengthBounds } from "./anagram-difficulty";
import { normalizeAnswer } from "./answer-format";
import { prepareAnagramClue, verifyAnagramClue } from "./anagram-engine";
import { applyExplanationCapitalizationToClue } from "./clue-capitalization-align";
import { listCandidatePairs, defaultMaxAnswersToProcess, type AnagramPair, type PairSearchOptions } from "./anagram-dictionary";
import { buildProgrammaticClue } from "./anagram-fallback-clue";
import { extractIndicatorFromClue, usedIndicatorsFromClues } from "./anagram-indicators";
import {
  buildGenerationExcludeList,
  filterExcludedPairs,
  isAnswerExcluded,
  usedAnswersFromClues,
} from "./generation-exclude";
import {
  buildIndicatorGuidance,
  isHotArchiveIndicator,
  type IndicatorGuidance,
} from "./indicator-archive-weights";
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
  buildHotIndicatorSwapPrompt,
  ANAGRAM_INDICATOR_REFINE_SYSTEM,
  ANAGRAM_HOT_INDICATOR_SWAP_SYSTEM,
  ANAGRAM_SETTER_SYSTEM,
  buildAnagramSetterPrompt,
} from "./anagram-prompts";
import { buildAnswerContext } from "./answer-context";
import { buildClueSurfaceExplanation } from "./clue-surface-explain";
import { createClaudeCallRecorder } from "./claude-trace";
import { anthropicChatJson, parseModelJson } from "./llm";
import { setterModel } from "./models";
import type {
  AnagramClueDraft,
  AnagramClueResult,
  AnagramDifficulty,
  AnagramRequest,
  AnagramStrategy,
  ClaudeCallTrace,
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
  indicatorGuidance: IndicatorGuidance;
  setterPrompt: string;
  repairPrompts: PromptTurn[];
  surfacePrompts: PromptTurn[];
  answerPrompts: PromptTurn[];
  pairSelectPrompts: PromptTurn[];
  templatePolishPrompts: PromptTurn[];
  indicatorRefinePrompts: PromptTurn[];
  hotIndicatorSwapPrompts: PromptTurn[];
  claudeTrace: ClaudeCallTrace[];
  llmCalls: number;
  deadlineAt: number;
  usedClaudeRanking: boolean;
  minThemeScore?: number;
  /** Skip Claude polish/refine — return the first verified programmatic clue. */
  skipLlmPolish?: boolean;
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
  label: string,
  system: string,
  user: string,
  promptBucket?: PromptTurn[]
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
    const turn: PromptTurn = {
      system,
      user,
      response: content,
    };
    promptBucket?.push(turn);
    ctx.claudeTrace.push({
      order: ctx.claudeTrace.length + 1,
      label,
      ...turn,
    });
    return content;
  } catch {
    const turn: PromptTurn = { system, user };
    promptBucket?.push(turn);
    ctx.claudeTrace.push({
      order: ctx.claudeTrace.length + 1,
      label,
      ...turn,
    });
    return null;
  }
}

function verifyOptions(ctx: PipelineContext) {
  return {
    inspiration: ctx.inspiration,
    suggestedAnswers: ctx.suggestedAnswers,
    minThemeScore: ctx.minThemeScore,
  };
}

function surfaceBuildOptions(ctx: PipelineContext) {
  return {
    avoidIndicators: ctx.avoidIndicators,
    suggestedAnswers: ctx.suggestedAnswers,
    archiveCounts: ctx.indicatorGuidance.archiveCounts,
    minThemeScore: ctx.minThemeScore,
  };
}

function summarizePairFailures(
  ctx: PipelineContext,
  pairs: AnagramPair[]
): string {
  const failureCounts = new Map<string, number>();
  let templatesBuilt = 0;

  for (const pair of pairs.slice(0, 12)) {
    const template = buildProgrammaticClue(pair, ctx.inspiration, surfaceBuildOptions(ctx));
    if (template) {
      templatesBuilt++;
      continue;
    }
    const probe = verifyAnagramClue(
      {
        answer: pair.answer,
        clue: `Probe: ${pair.fodder} in chaos (${pair.answer.replace(/[^A-Z]/g, "").length})`,
        anagramFodder: pair.fodder,
        anagramIndicator: "in chaos",
      },
      verifyOptions(ctx)
    );
    for (const err of probe.errors) {
      failureCounts.set(err, (failureCounts.get(err) ?? 0) + 1);
    }
  }

  const topFailures = [...failureCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([reason, count]) => `${count}x ${reason}`)
    .join("; ");

  return [
    `pairs=${pairs.length}`,
    `exclude=${ctx.exclude.length}`,
    `templates=${templatesBuilt}/${Math.min(12, pairs.length)}`,
    `suggested=${ctx.suggestedAnswers.length}`,
    topFailures ? `failures=${topFailures}` : "",
  ]
    .filter(Boolean)
    .join(", ");
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
    claudeTrace: ctx.claudeTrace,
    prompts: {
      setter: { system: ANAGRAM_SETTER_SYSTEM, user: ctx.setterPrompt },
      repairs: ctx.repairPrompts,
      surface: ctx.surfacePrompts,
      answer: ctx.answerPrompts,
      pairSelect: ctx.pairSelectPrompts,
      templatePolish: ctx.templatePolishPrompts,
      indicatorRefine: ctx.indicatorRefinePrompts,
      hotIndicatorSwap: ctx.hotIndicatorSwapPrompts,
    },
  };
}

async function selectPairWithClaude(
  ctx: PipelineContext,
  candidates: AnagramPair[]
): Promise<AnagramPair | null> {
  if (candidates.length < 2 || !hasPipelineTime(ctx)) return null;

  const prompt = buildPairSelectPrompt(ctx.inspiration, candidates);
  const content = await callClaude(
    ctx,
    "Pair selection",
    ANAGRAM_PAIR_SELECT_SYSTEM,
    prompt,
    ctx.pairSelectPrompts
  );
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
        ctx.indicatorGuidance
      );
      const content = await callClaude(
        ctx,
        attempt === 0 ? "Template polish" : "Template polish repair",
        ANAGRAM_TEMPLATE_POLISH_SYSTEM,
        user,
        ctx.templatePolishPrompts
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
        ctx.indicatorGuidance
      );
      const content = await callClaude(
        ctx,
        attempt === 0 ? "Template polish" : "Template polish repair",
        ANAGRAM_TEMPLATE_POLISH_SYSTEM,
        user,
        ctx.templatePolishPrompts
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
        ctx.indicatorGuidance
      );
      const content = await callClaude(
        ctx,
        attempt === 0 ? "Indicator refine" : "Indicator refine repair",
        ANAGRAM_INDICATOR_REFINE_SYSTEM,
        user,
        ctx.indicatorRefinePrompts
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
        ctx.indicatorGuidance
      );
      const content = await callClaude(
        ctx,
        attempt === 0 ? "Indicator refine" : "Indicator refine repair",
        ANAGRAM_INDICATOR_REFINE_SYSTEM,
        user,
        ctx.indicatorRefinePrompts
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

async function swapHotIndicator(
  ctx: PipelineContext,
  pair: AnagramPair,
  base: AnagramClueDraft,
  hotIndicator: string
): Promise<AnagramClueResult | null> {
  if (!hasPipelineTime(ctx)) return null;

  const user = buildHotIndicatorSwapPrompt(
    ctx.inspiration,
    pair.answer,
    base.anagramFodder,
    base.clue,
    hotIndicator,
    ctx.indicatorGuidance
  );
  const content = await callClaude(
    ctx,
    "Hot indicator swap",
    ANAGRAM_HOT_INDICATOR_SWAP_SYSTEM,
    user,
    ctx.hotIndicatorSwapPrompts
  );
  if (!content) return null;

  const draft = lockPairDraft(parseModelJson<AnagramClueDraft>(content), pair);
  const verification = verifyAnagramClue(draft, verifyOptions(ctx));
  if (!verification.ok) return null;

  return successResult(ctx, verification.prepared, "indicator-refine", 1);
}

async function ensureFreshIndicator(
  ctx: PipelineContext,
  pair: AnagramPair,
  result: AnagramClueResult
): Promise<AnagramClueResult> {
  const refined = await maybeRefineIndicator(ctx, pair, result);

  const indicator =
    refined.clue.anagramIndicator?.trim() ||
    extractIndicatorFromClue(refined.clue.clue);

  if (
    !indicator ||
    !isHotArchiveIndicator(indicator, ctx.indicatorGuidance.archiveCounts) ||
    !hasPipelineTime(ctx)
  ) {
    return refined;
  }

  const swapped = await swapHotIndicator(ctx, pair, refined.clue, indicator);
  return swapped ?? refined;
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

    const template = buildProgrammaticClue(pair, ctx.inspiration, surfaceBuildOptions(ctx));
    if (!template) continue;

    const plainStrategy: AnagramStrategy = ctx.usedClaudeRanking
      ? "claude-ranked-pair"
      : "programmatic-surface";
    const plain = successResult(ctx, template, plainStrategy, 1);
    if (!plain || isAnswerExcluded(plain.clue.answer, exclude)) {
      continue;
    }

    if (ctx.skipLlmPolish) {
      return plain;
    }

    if (hasPipelineTime(ctx)) {
      const polished = await polishTemplate(ctx, pair, template.clue);
      if (polished && !isAnswerExcluded(polished.clue.answer, exclude)) {
        const refined = await ensureFreshIndicator(ctx, pair, polished);
        if (!isAnswerExcluded(refined.clue.answer, exclude)) {
          return refined;
        }
      }

      const refinedPlain = await ensureFreshIndicator(ctx, pair, plain);
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

  const recordCall = createClaudeCallRecorder(ctx.claudeTrace);

  const answerEnriched = await buildAnswerContext(
    ctx.apiKey,
    result.clue.answer,
    ctx.inspiration,
    recordCall
  );
  const surfaceEnriched = await buildClueSurfaceExplanation(
    ctx.apiKey,
    result.clue,
    ctx.inspiration,
    recordCall
  );

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
    claudeTrace: ctx.claudeTrace,
  };
}

export interface AnagramPipelineFailure {
  error: string;
  llmCalls: number;
  /** Server-side diagnostics — not shown to users. */
  debug?: string;
}

async function suggestThemeAnswers(ctx: PipelineContext): Promise<string[]> {
  if (!hasPipelineTime(ctx)) return [];

  const excludedAnswers = usedAnswersFromClues(ctx.exclude);
  const user = buildAnagramAnswerListPrompt(
    ctx.inspiration,
    ctx.bounds,
    excludedAnswers
  );
  const content = await callClaude(
    ctx,
    "Theme answer suggestions",
    ANAGRAM_ANSWER_LIST_SYSTEM,
    user,
    ctx.answerPrompts
  );
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
  initialClaudeTrace?: ClaudeCallTrace[];
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
  const themeAvoid = usedIndicatorsFromClues(exclude);
  const indicatorGuidance = buildIndicatorGuidance({
    themeAvoid,
    seed: inspiration,
  });

  const ctx: PipelineContext = {
    apiKey,
    inspiration,
    autoThemed,
    suggestedAnswers: [],
    difficulty,
    bounds,
    exclude,
    avoidIndicators: indicatorGuidance.avoid,
    indicatorGuidance,
    setterPrompt: buildAnagramSetterPrompt(inspiration, indicatorGuidance),
    repairPrompts: [],
    surfacePrompts: [],
    answerPrompts: [],
    pairSelectPrompts: [],
    templatePolishPrompts: [],
    indicatorRefinePrompts: [],
    hotIndicatorSwapPrompts: [],
    claudeTrace: options.initialClaudeTrace ? [...options.initialClaudeTrace] : [],
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

  const diagnostics = summarizePairFailures(ctx, pairs);

  if (hasPipelineTime(ctx)) {
    const relaxedCtx: PipelineContext = {
      ...ctx,
      avoidIndicators: indicatorGuidance.themeAvoid,
      minThemeScore: 220,
      skipLlmPolish: true,
      usedClaudeRanking: false,
    };

    const relaxedPairs =
      pairs.length >= 8
        ? pairs
        : searchCandidatePairs(ctx, bounds, suggestedAnswers, excludedAnswers, {
            minThemeScore: 220,
            dictionaryScanLimit: difficulty === "hard" ? 200 : 160,
            maxAnswersToProcess:
              defaultMaxAnswersToProcess(bounds, exclude.length) + 24,
          });

    const relaxed = await generateFromPairs(relaxedCtx, relaxedPairs);
    if (relaxed) {
      return enrichWithAnswerContext(ctx, {
        ...relaxed,
        strategy: "programmatic-surface",
      });
    }
  }

  const timedOut = !hasPipelineTime(ctx);
  return {
    error: timedOut
      ? "Generation timed out. Check your connection and try again."
      : exclude.length > 0
        ? `Could not find another unused answer for this theme after ${pairs.length} attempt(s). Try Restart with a fresh theme, or broaden the inspiration.`
        : `Could not build a verified clue from ${pairs.length} candidate pair(s). Many themed names lack valid anagram fodder — try a shorter inspiration or rephrase the theme.`,
    llmCalls: ctx.llmCalls,
    debug: diagnostics,
  };
}
