import { answerLengthBounds, type AnswerLengthBounds } from "./anagram-difficulty";
import {
  buildHomophoneExcludeList,
  filterExcludedPairs,
} from "./generation-exclude";
import { usedHomophoneWordsFromClues } from "./clue-history";
import {
  isDuplicateClue,
  isClueReuseBlocked,
} from "./clue-history";
import {
  listCandidateHomophonePairs,
  type HomophonePair,
  type HomophonePairSearchOptions,
} from "./homophone-dictionary";
import { defaultMaxAnswersToProcess } from "./anagram-dictionary";
import { buildHomophoneBreakdown } from "./homophone-breakdown";
import {
  hasHomophoneHintPhrases,
  homophoneHintPhrases,
} from "./homophone-definitions";
import { ensureHomophoneSynonyms, getHomophoneSynonyms } from "./db/homophones";
import { prepareHomophoneClue, verifyHomophoneClue } from "./homophone-engine";
import { generateHomophoneClueWithClaude } from "./homophone-llm";
import { buildProgrammaticHomophoneClue } from "./homophone-surface";
import { buildHomophoneIndicatorGuidance } from "./homophone-indicator-themes";
import { sampleWithSeed, usedIndicatorsFromClues } from "./anagram-indicators";
import { randomUUID } from "node:crypto";
import type {
  AnagramClueDraft,
  AnagramClueResult,
  AnagramStrategy,
  ClaudeCallTrace,
  HomophoneRequest,
  UsedAnagramClue,
} from "./types";

const MAX_PAIRS_TO_TRY = 32;
const INITIAL_PAIR_POOL = 48;

type HomophoneIndicatorContext = ReturnType<typeof buildHomophoneIndicatorGuidance>;

export interface HomophonePipelineFailure {
  error: string;
  llmCalls: number;
  debug?: string;
}

export interface GenerateHomophoneOptions {
  skipLlm?: boolean;
}

function pairPoolLimit(excludeCount: number): number {
  if (excludeCount === 0) return INITIAL_PAIR_POOL;
  return Math.min(72, 48 + excludeCount * 12);
}

function pairSearchDepth(
  bounds: AnswerLengthBounds,
  excludeCount: number,
  isRetry: boolean
): Pick<HomophonePairSearchOptions, "dictionaryScanLimit" | "maxAnswersToProcess"> {
  if (!isRetry) {
    return {
      dictionaryScanLimit: 160,
      maxAnswersToProcess: 48,
    };
  }

  return {
    dictionaryScanLimit: 200,
    maxAnswersToProcess: defaultMaxAnswersToProcess(bounds, excludeCount),
  };
}

async function tryPairProgrammatic(
  pair: HomophonePair,
  exclude: UsedAnagramClue[],
  indicatorCtx: HomophoneIndicatorContext,
  shuffleSeed: string
): Promise<AnagramClueDraft | null> {
  const [answerHasHints, fodderHasHints] = await Promise.all([
    hasHomophoneHintPhrases(pair.answer),
    hasHomophoneHintPhrases(pair.fodder),
  ]);
  if (!answerHasHints || !fodderHasHints) return null;

  const answerHints = await homophoneHintPhrases(pair.answer);
  const fodderHints = await homophoneHintPhrases(pair.fodder);
  if (answerHints.length === 0 || fodderHints.length === 0) return null;
  const draft = buildProgrammaticHomophoneClue(pair, {
    avoidIndicators: indicatorCtx.avoid,
    answerHints,
    fodderHints,
    shuffleSeed,
    archiveCounts: indicatorCtx.archiveCounts,
  });
  if (!draft) return null;

  const verification = verifyHomophoneClue(prepareHomophoneClue(draft));
  if (!verification.ok) return null;

  if (isDuplicateClue(verification.prepared, exclude)) return null;
  if (isClueReuseBlocked(verification.prepared, exclude)) return null;

  return verification.prepared;
}

async function tryPairWithClaude(
  apiKey: string,
  pair: HomophonePair,
  exclude: UsedAnagramClue[],
  indicatorCtx: HomophoneIndicatorContext,
  shuffleSeed: string,
  claudeTrace: ClaudeCallTrace[]
): Promise<{ draft: AnagramClueDraft | null; llmCalls: number }> {
  const answerSynonyms = getHomophoneSynonyms(pair.answer);
  const fodderSynonyms = getHomophoneSynonyms(pair.fodder);

  const llmResult = await generateHomophoneClueWithClaude(apiKey, pair, {
    answerSynonyms,
    fodderSynonyms,
    avoidIndicators: indicatorCtx.avoid,
    preferIndicators: indicatorCtx.prefer,
    hotIndicators: indicatorCtx.hot,
    archiveCounts: indicatorCtx.archiveCounts,
    shuffleSeed,
  });
  claudeTrace.push(...llmResult.claudeTrace);

  if (!llmResult.draft) {
    return { draft: null, llmCalls: llmResult.llmCalls };
  }

  const verification = verifyHomophoneClue(llmResult.draft);
  if (!verification.ok) {
    return { draft: null, llmCalls: llmResult.llmCalls };
  }

  if (isDuplicateClue(verification.prepared, exclude)) {
    return { draft: null, llmCalls: llmResult.llmCalls };
  }
  if (isClueReuseBlocked(verification.prepared, exclude)) {
    return { draft: null, llmCalls: llmResult.llmCalls };
  }

  return { draft: verification.prepared, llmCalls: llmResult.llmCalls };
}

async function tryPair(
  pair: HomophonePair,
  exclude: UsedAnagramClue[],
  indicatorCtx: HomophoneIndicatorContext,
  shuffleSeed: string,
  apiKey: string | null,
  skipLlm: boolean,
  claudeTrace: ClaudeCallTrace[]
): Promise<{ draft: AnagramClueDraft | null; llmCalls: number; strategy: AnagramStrategy }> {
  if (apiKey && !skipLlm) {
    const claudeAttempt = await tryPairWithClaude(
      apiKey,
      pair,
      exclude,
      indicatorCtx,
      shuffleSeed,
      claudeTrace
    );
    if (claudeAttempt.draft) {
      return {
        ...claudeAttempt,
        strategy: "homophone-claude",
      };
    }
    if (claudeAttempt.llmCalls > 0) {
      const programmatic = await tryPairProgrammatic(
        pair,
        exclude,
        indicatorCtx,
        shuffleSeed
      );
      return {
        draft: programmatic,
        llmCalls: claudeAttempt.llmCalls,
        strategy: "homophone-programmatic",
      };
    }
  }

  const programmatic = await tryPairProgrammatic(
    pair,
    exclude,
    indicatorCtx,
    shuffleSeed
  );
  return {
    draft: programmatic,
    llmCalls: 0,
    strategy: "homophone-programmatic",
  };
}

export async function generateVerifiedHomophoneClue(
  apiKey: string | null,
  req: HomophoneRequest,
  options: GenerateHomophoneOptions = {}
): Promise<AnagramClueResult | HomophonePipelineFailure> {
  const bounds = answerLengthBounds("easy");
  const exclude = buildHomophoneExcludeList(req.exclude ?? []);
  const sessionAvoid = usedIndicatorsFromClues(exclude);
  const shuffleSeed = `homophone|${exclude.length}|${Date.now()}|${randomUUID()}`;
  const indicatorCtx = buildHomophoneIndicatorGuidance({
    sessionAvoid,
    seed: shuffleSeed,
  });
  const excludedAnswers = usedHomophoneWordsFromClues(exclude);
  const isRetry = exclude.length > 0;
  const limit = pairPoolLimit(exclude.length);
  const depth = pairSearchDepth(bounds, exclude.length, isRetry);
  const claudeTrace: ClaudeCallTrace[] = [];
  let llmCalls = 0;

  await ensureHomophoneSynonyms();

  const pairs = filterExcludedPairs(
    listCandidateHomophonePairs(bounds, limit, {
      excludeAnswers: excludedAnswers,
      shuffleSeed,
      ...depth,
    }),
    exclude
  );

  if (pairs.length === 0) {
    return {
      error:
        exclude.length > 0
          ? "No more unused homophone answers are available — try Restart."
          : "No valid homophone pair could be found. Try again.",
      llmCalls: 0,
    };
  }

  for (const pair of sampleWithSeed(
    pairs,
    MAX_PAIRS_TO_TRY,
    `${shuffleSeed}-try`
  )) {
    const attempt = await tryPair(
      pair,
      exclude,
      indicatorCtx,
      shuffleSeed,
      apiKey,
      options.skipLlm === true,
      claudeTrace
    );
    llmCalls += attempt.llmCalls;
    if (!attempt.draft) continue;

    const verification = verifyHomophoneClue(attempt.draft);
    const homophoneBreakdown = await buildHomophoneBreakdown(
      verification.prepared
    );

    return {
      inspiration: "",
      clueType: "homophone",
      clue: verification.prepared,
      verified: true,
      verification,
      homophoneBreakdown,
      attempts: 1,
      strategy: attempt.strategy,
      difficulty: "easy",
      llmCalls,
      claudeTrace: claudeTrace.length > 0 ? claudeTrace : undefined,
    };
  }

  return {
    error:
      "Found homophone pairs but could not build a verified clue — try again.",
    llmCalls,
  };
}
