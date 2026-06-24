import {
  fetchClaudeDefinitionSeeds,
  MIN_REGISTRY_SEEDS_BEFORE_CLAUDE,
} from "@/lib/claude-definition-seeds";
import { createClaudeCallRecorder } from "@/lib/claude-trace";
import { collectDefinitionSeeds } from "@/lib/definition-domains";
import {
  getCachedDefinitionSeeds,
  saveCachedDefinitionSeeds,
} from "@/lib/db/definition-seed-cache";
import type { ClaudeCallTrace } from "@/lib/types";

export interface EnsureDefinitionSeedsContext {
  apiKey: string;
  inspiration: string;
  claudeTrace: ClaudeCallTrace[];
  llmCalls: number;
}

/**
 * Load cached Claude seeds for this inspiration, or fetch once when the
 * registry has too few phrases. Returns seeds to merge into templates.
 */
export async function ensureClaudeDefinitionSeeds(
  ctx: EnsureDefinitionSeedsContext
): Promise<string[]> {
  const cached = getCachedDefinitionSeeds(ctx.inspiration);
  if (cached) return cached;

  const registryCount = collectDefinitionSeeds(ctx.inspiration, "").length;
  if (registryCount >= MIN_REGISTRY_SEEDS_BEFORE_CLAUDE) return [];

  const recordCall = createClaudeCallRecorder(ctx.claudeTrace);
  const seeds = await fetchClaudeDefinitionSeeds(
    ctx.apiKey,
    ctx.inspiration,
    recordCall
  );

  if (seeds.length > 0) {
    saveCachedDefinitionSeeds(ctx.inspiration, seeds);
    ctx.llmCalls += 1;
  }

  return seeds;
}
