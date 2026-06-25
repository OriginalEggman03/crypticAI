import { NextRequest, NextResponse } from "next/server";
import { isLegacyApiDisabled } from "@/lib/legacy-api";
import { buildCrossword } from "@/lib/crossword";
import {
  dedupeFailuresForRepair,
  prepareDraftsForVerification,
  relaxMechanicalTypesForAllMode,
  summarizeFailures,
  verifyPuzzleEntries,
  type PuzzleEntryDraft,
  type VerificationFailure,
} from "@/lib/clue-verify";
import {
  MAX_FIX_STEPS,
  MAX_GENERATION_ATTEMPTS,
  MAX_LLM_CALLS,
  MAX_WALL_MS,
} from "@/lib/generate-limits";
import { buildThemeWords, ensureSpellChecker } from "@/lib/spell-check";
import { anthropicChatJson, parseModelJson } from "@/lib/llm";
import {
  criticModel,
  repairModel,
  setterModel,
} from "@/lib/models";
import {
  buildCriticPrompt,
  buildFocusedHiddenRepairPrompt,
  buildGenerationPrompt,
  buildRepairPrompt,
  buildReplaceFailedEntriesPrompt,
  CRITIC_SYSTEM,
  REPAIR_SYSTEM,
  SETTER_SYSTEM,
  WORD_COUNT,
} from "@/lib/prompts";
import type { ClueTypeOption } from "@/lib/clue-types";
import type { GenerateResponse, PuzzleEntry, UserPreferences } from "@/lib/types";

function clueTypeFor(prefs: UserPreferences): ClueTypeOption {
  return (prefs.clueType ?? "all") as ClueTypeOption;
}

/** Next.js / Vercel route timeout (seconds). */
export const maxDuration = 120;

type FixStep = { kind: "repair" } | { kind: "hidden" } | { kind: "replace" };

const FIX_PIPELINE: FixStep[] = [
  { kind: "repair" },
  { kind: "hidden" },
  { kind: "replace" },
  { kind: "repair" },
  { kind: "replace" },
];

class GenerationLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationLimitError";
  }
}

class LlmBudget {
  used = 0;
  private readonly deadline: number;

  constructor(deadlineMs: number = MAX_WALL_MS) {
    this.deadline = Date.now() + deadlineMs;
  }

  hasRoom(): boolean {
    return this.used < MAX_LLM_CALLS && !this.isTimedOut();
  }

  remaining(): number {
    return MAX_LLM_CALLS - this.used;
  }

  isTimedOut(): boolean {
    return Date.now() >= this.deadline;
  }

  async call(options: Parameters<typeof anthropicChatJson>[0]): Promise<string> {
    if (this.isTimedOut()) {
      throw new GenerationLimitError("Generation timed out");
    }
    if (this.used >= MAX_LLM_CALLS) {
      throw new GenerationLimitError("LLM call budget exhausted");
    }
    this.used++;
    return anthropicChatJson(options);
  }
}

function toDrafts(generated: GenerateResponse): PuzzleEntryDraft[] {
  if (!generated.entries?.length) {
    throw new Error("Model returned no entries");
  }
  return generated.entries.map((e) => ({
    answer: e.answer,
    clue: e.clue,
    clueType: e.clueType ?? "unknown",
    anagramFodder: e.anagramFodder,
  }));
}

function toEntries(drafts: PuzzleEntryDraft[]): PuzzleEntry[] {
  return drafts.map((e, i) => ({
    id: `e${i}`,
    answer: e.answer,
    clue: e.clue,
    clueType: e.clueType,
    anagramFodder: e.anagramFodder ?? null,
  }));
}

function ensureEntryMetadata(generated: GenerateResponse): GenerateResponse {
  return {
    ...generated,
    entries: generated.entries.map((e) => ({
      ...e,
      clueType: e.clueType ?? "unknown",
      anagramFodder: e.anagramFodder ?? null,
    })),
  };
}

function isHiddenOnlyFailure(failures: VerificationFailure[]): boolean {
  return (
    failures.length > 0 &&
    failures.every(
      (f) => f.clueType === "hidden" || f.clueType === "reverse-hidden"
    )
  );
}

function puzzleFromDrafts(
  puzzle: GenerateResponse,
  drafts: PuzzleEntryDraft[]
): GenerateResponse {
  return {
    ...puzzle,
    entries: drafts.map((d) => ({
      answer: d.answer,
      clue: d.clue,
      clueType: d.clueType,
      anagramFodder: d.anagramFodder ?? null,
    })),
  };
}

async function generateDraft(
  budget: LlmBudget,
  apiKey: string,
  prefs: UserPreferences,
  withCritic: boolean
): Promise<GenerateResponse> {
  const draftContent = await budget.call({
    apiKey,
    model: setterModel(),
    system: SETTER_SYSTEM,
    user: buildGenerationPrompt(prefs),
  });
  let puzzle = ensureEntryMetadata(parseModelJson<GenerateResponse>(draftContent));

  if (withCritic && budget.hasRoom()) {
    const reviewedContent = await budget.call({
      apiKey,
      model: criticModel(),
      system: CRITIC_SYSTEM,
      user: buildCriticPrompt(prefs.inspiration, clueTypeFor(prefs), puzzle),
    });
    puzzle = ensureEntryMetadata(parseModelJson<GenerateResponse>(reviewedContent));
  }

  return puzzle;
}

async function repairPuzzle(
  budget: LlmBudget,
  apiKey: string,
  prefs: UserPreferences,
  puzzle: GenerateResponse,
  failures: VerificationFailure[]
): Promise<GenerateResponse> {
  const repairContent = await budget.call({
    apiKey,
    model: repairModel(),
    system: REPAIR_SYSTEM,
    user: buildRepairPrompt(
      prefs.inspiration,
      clueTypeFor(prefs),
      puzzle,
      dedupeFailuresForRepair(failures)
    ),
  });
  return ensureEntryMetadata(parseModelJson<GenerateResponse>(repairContent));
}

async function focusedHiddenRepair(
  budget: LlmBudget,
  apiKey: string,
  prefs: UserPreferences,
  puzzle: GenerateResponse,
  failures: VerificationFailure[]
): Promise<GenerateResponse> {
  const repairContent = await budget.call({
    apiKey,
    model: repairModel(),
    system: REPAIR_SYSTEM,
    user: buildFocusedHiddenRepairPrompt(
      prefs.inspiration,
      clueTypeFor(prefs),
      puzzle,
      failures
    ),
  });
  return ensureEntryMetadata(parseModelJson<GenerateResponse>(repairContent));
}

async function replaceFailedEntries(
  budget: LlmBudget,
  apiKey: string,
  prefs: UserPreferences,
  puzzle: GenerateResponse,
  failures: VerificationFailure[]
): Promise<GenerateResponse> {
  const repairContent = await budget.call({
    apiKey,
    model: repairModel(),
    system: REPAIR_SYSTEM,
    user: buildReplaceFailedEntriesPrompt(
      prefs.inspiration,
      clueTypeFor(prefs),
      puzzle,
      failures
    ),
  });
  return ensureEntryMetadata(parseModelJson<GenerateResponse>(repairContent));
}

async function runFixStep(
  step: FixStep,
  budget: LlmBudget,
  apiKey: string,
  prefs: UserPreferences,
  puzzle: GenerateResponse,
  failures: VerificationFailure[]
): Promise<GenerateResponse> {
  switch (step.kind) {
    case "repair":
      return repairPuzzle(budget, apiKey, prefs, puzzle, failures);
    case "hidden":
      return focusedHiddenRepair(budget, apiKey, prefs, puzzle, failures);
    case "replace":
      return replaceFailedEntries(budget, apiKey, prefs, puzzle, failures);
  }
}

async function ensureVerifiedPuzzle(
  budget: LlmBudget,
  apiKey: string,
  prefs: UserPreferences
): Promise<GenerateResponse> {
  let puzzle = await generateDraft(budget, apiKey, prefs, true);
  let themeWords = buildThemeWords(
    prefs.inspiration,
    puzzle.entries.map((e) => e.answer)
  );
  let drafts = prepareDraftsForVerification(toDrafts(puzzle));
  let failures = verifyPuzzleEntries(drafts, clueTypeFor(prefs), themeWords);

  for (let i = 0; i < MAX_FIX_STEPS && failures.length > 0; i++) {
    const step = FIX_PIPELINE[i];
    if (!step) break;
    if (!budget.hasRoom()) break;

    if (step.kind === "hidden" && !isHiddenOnlyFailure(failures)) {
      continue;
    }

    puzzle = await runFixStep(
      step,
      budget,
      apiKey,
      prefs,
      puzzle,
      dedupeFailuresForRepair(failures)
    );
    drafts = prepareDraftsForVerification(toDrafts(puzzle));
    themeWords = buildThemeWords(
      prefs.inspiration,
      puzzle.entries.map((e) => e.answer)
    );
    failures = verifyPuzzleEntries(drafts, clueTypeFor(prefs), themeWords);
  }

  if (failures.length > 0 && budget.hasRoom()) {
    puzzle = await replaceFailedEntries(
      budget,
      apiKey,
      prefs,
      puzzle,
      dedupeFailuresForRepair(failures)
    );
    drafts = prepareDraftsForVerification(toDrafts(puzzle));
    themeWords = buildThemeWords(
      prefs.inspiration,
      puzzle.entries.map((e) => e.answer)
    );
    failures = verifyPuzzleEntries(drafts, clueTypeFor(prefs), themeWords);
  }

  if (failures.length > 0 && clueTypeFor(prefs) === "all") {
    drafts = relaxMechanicalTypesForAllMode(drafts, failures);
    drafts = prepareDraftsForVerification(drafts);
    failures = verifyPuzzleEntries(drafts, clueTypeFor(prefs), themeWords);
    if (failures.length === 0) {
      return puzzleFromDrafts(puzzle, drafts);
    }
  }

  if (failures.length > 0) {
    drafts = prepareDraftsForVerification(drafts);
    failures = verifyPuzzleEntries(drafts, clueTypeFor(prefs), themeWords);
  }

  const spellingOnly =
    failures.length > 0 &&
    failures.every((f) => f.clueType === "spelling");

  if (spellingOnly && budget.hasRoom()) {
    puzzle = await repairPuzzle(
      budget,
      apiKey,
      prefs,
      puzzle,
      dedupeFailuresForRepair(failures)
    );
    drafts = prepareDraftsForVerification(toDrafts(puzzle));
    themeWords = buildThemeWords(
      prefs.inspiration,
      puzzle.entries.map((e) => e.answer)
    );
    failures = verifyPuzzleEntries(drafts, clueTypeFor(prefs), themeWords);
  }

  if (failures.length > 0 || drafts.length < WORD_COUNT) {
    console.error(
      "[generate] verification failed:",
      summarizeFailures(failures),
      failures.map((f) => ({
        index: f.index + 1,
        answer: f.answer,
        type: f.clueType,
        reason: f.reason,
      }))
    );
    throw new Error(
      `Could not build a verified puzzle (${summarizeFailures(failures)}). Please try generating again.`
    );
  }

  return puzzleFromDrafts(puzzle, drafts);
}

export async function POST(request: NextRequest) {
  if (isLegacyApiDisabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const body = (await request.json()) as { preferences: UserPreferences };

    const prefs: UserPreferences = {
      inspiration: body.preferences.inspiration,
      clueType: body.preferences.clueType ?? "all",
    };

    if (!prefs.inspiration?.trim()) {
      return NextResponse.json(
        { error: "Add some Crossword Inspiration so the puzzle has a theme." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No Anthropic API key. Set ANTHROPIC_API_KEY in .env.local.",
        },
        { status: 401 }
      );
    }

    await ensureSpellChecker();
    const globalDeadline = Date.now() + MAX_WALL_MS;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const remainingMs = globalDeadline - Date.now();
      if (remainingMs <= 0) break;

      const budget = new LlmBudget(remainingMs);

      try {
        const puzzle = await ensureVerifiedPuzzle(budget, apiKey, prefs);
        const drafts = toDrafts(puzzle);
        const entries = toEntries(drafts);
        const gridPuzzle = buildCrossword(
          puzzle.title,
          puzzle.subtitle,
          entries
        );

        if (gridPuzzle) {
          return NextResponse.json({
            puzzle: gridPuzzle,
            dropped: entries.length - gridPuzzle.entries.length,
          });
        }

        lastError = new Error(
          "Could not fit enough words on the grid. Please try generating again."
        );
      } catch (err) {
        if (err instanceof GenerationLimitError) {
          lastError = err;
        } else if (err instanceof Error) {
          lastError = err;
        } else {
          lastError = new Error("Generation failed");
        }
      }
    }

    if (lastError instanceof GenerationLimitError) {
      return NextResponse.json(
        {
          error:
            "Generation took too long. Please try again — a second attempt often succeeds.",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: lastError?.message ?? "Generation failed" },
      { status: 500 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
