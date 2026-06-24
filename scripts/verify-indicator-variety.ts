/**
 * End-to-end verification of archive-weighted anagram indicator variety.
 *
 * Usage: npx tsx scripts/verify-indicator-variety.ts [--live]
 *   --live  Run one Claude generation (requires ANTHROPIC_API_KEY in .env.local)
 */
import assert from "node:assert/strict";
import { loadEnvLocal } from "../lib/load-env-local";
import {
  buildIndicatorGuidance,
  getIndicatorUsageCounts,
  HOT_INDICATOR_THRESHOLD,
  invalidateIndicatorUsageCache,
  isHotArchiveIndicator,
} from "../lib/indicator-archive-weights";
import {
  extractIndicatorFromClue,
  indicatorSurfaceScore,
  normalizeIndicatorKey,
  pickIndicatorPhrases,
  usedIndicatorsFromClues,
} from "../lib/anagram-indicators";
import {
  buildIndicatorRefinePrompt,
  buildTemplatePolishPrompt,
} from "../lib/anagram-prompts";
import { archivedCluesForInspiration } from "../lib/generation-exclude";
import { searchArchivedClues } from "../lib/db/clue-archive";
import { generateVerifiedAnagramClue } from "../lib/anagram-pipeline";

loadEnvLocal();

const runLive = process.argv.includes("--live");

async function main() {
function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function topIndicators(counts: Map<string, number>, n = 8) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => `${k} (${v})`);
}

section("Archive indicator frequency");
invalidateIndicatorUsageCache();
const archiveCounts = getIndicatorUsageCounts();
const clueCount = searchArchivedClues({ limit: 500 }).length;
console.log(`Archived clues: ${clueCount}`);
console.log(`Unique indicators: ${archiveCounts.size}`);
console.log(`Top indicators: ${topIndicators(archiveCounts).join(", ")}`);

const hotList = [...archiveCounts.entries()]
  .filter(([, n]) => n >= HOT_INDICATOR_THRESHOLD)
  .sort((a, b) => b[1] - a[1])
  .map(([k]) => k);
console.log(`Hot (≥${HOT_INDICATOR_THRESHOLD} uses): ${hotList.join(", ") || "(none)"}`);

section("Guidance for new theme (no prior clues)");
const freshGuidance = buildIndicatorGuidance({
  themeAvoid: [],
  archiveCounts,
  seed: "brand-new-theme-xyz",
});
assert.ok(freshGuidance.hot.length > 0 || clueCount < HOT_INDICATOR_THRESHOLD, "hot list populated when archive has repeats");
assert.ok(freshGuidance.prefer.length > 0, "prefer list should not be empty");
for (const hot of freshGuidance.hot) {
  assert.ok(freshGuidance.avoid.includes(hot), `hot "${hot}" should be in avoid`);
  assert.ok(
    !freshGuidance.prefer.some((p) => normalizeIndicatorKey(p) === hot),
    `hot "${hot}" should not be in prefer`
  );
}
console.log(`Avoid count: ${freshGuidance.avoid.length}`);
console.log(`Prefer sample: ${freshGuidance.prefer.slice(0, 5).join("; ")}`);

section("Guidance for archived theme (Batman)");
const batmanInspiration = "Batman movie characters";
const batmanExclude = archivedCluesForInspiration(batmanInspiration);
const batmanThemeAvoid = usedIndicatorsFromClues(batmanExclude);
const batmanGuidance = buildIndicatorGuidance({
  themeAvoid: batmanThemeAvoid,
  archiveCounts,
  seed: batmanInspiration,
});
console.log(`Batman archived clues: ${batmanExclude.length}`);
console.log(`Theme-specific avoid: ${batmanGuidance.themeAvoid.join(", ") || "(none)"}`);
assert.ok(
  batmanGuidance.themeAvoid.every((t) => batmanGuidance.avoid.includes(t)),
  "theme avoid should be subset of full avoid"
);

section("Claude prompts include PREFER / AVOID");
const polishPrompt = buildTemplatePolishPrompt(
  batmanInspiration,
  "JOKER",
  "joke r",
  "A villain, joke r, in chaos (5)",
  batmanGuidance
);
assert.match(polishPrompt, /PREFER \(rare in our archive/, "polish prompt should include PREFER");
assert.match(polishPrompt, /AVOID \(overused in our archive\)/, "polish prompt should include archive AVOID");
if (freshGuidance.hot.length > 0) {
  assert.ok(
    polishPrompt.includes(freshGuidance.hot[0]),
    "polish prompt should name at least one hot indicator"
  );
}

const refinePrompt = buildIndicatorRefinePrompt(
  batmanInspiration,
  "JOKER",
  "joke r",
  "A villain, joke r, twisted (5)",
  batmanGuidance
);
assert.match(refinePrompt, /PREFER \(rare in our archive/, "refine prompt should include PREFER");

section("Programmatic indicator selection");
const picked = pickIndicatorPhrases({
  seed: "verify-pick",
  avoid: freshGuidance.avoid,
  archiveCounts,
  count: 10,
});
assert.ok(picked.length > 0, "pickIndicatorPhrases should return options");
for (const phrase of picked) {
  const key = normalizeIndicatorKey(phrase);
  assert.ok(
    !freshGuidance.avoid.includes(key),
    `picked "${phrase}" should not be in avoid list`
  );
}
if (hotList.length > 0) {
  const firstPick = normalizeIndicatorKey(picked[0]);
  const firstUses = archiveCounts.get(firstPick) ?? 0;
  const lastPick = normalizeIndicatorKey(picked[picked.length - 1]);
  const lastUses = archiveCounts.get(lastPick) ?? 0;
  assert.ok(
    firstUses <= lastUses,
    "pickIndicatorPhrases should sort cold indicators first"
  );
}
console.log(`pickIndicatorPhrases first: "${picked[0]}", last: "${picked[picked.length - 1]}"`);

const coldScore = indicatorSurfaceScore("in chaos", freshGuidance.avoid, archiveCounts);
const hotScore = indicatorSurfaceScore(hotList[0] ?? "twisted", freshGuidance.avoid, archiveCounts);
assert.ok(coldScore > hotScore, `cold score (${coldScore}) should beat hot (${hotScore})`);
console.log(`Surface scores — cold "in chaos": ${coldScore}, hot "${hotList[0]}": ${hotScore}`);

if (runLive) {
  section("Live Claude generation");
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    console.error("Skipping live test: ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  const inspiration = "Obscure test theme for indicator variety check";
  console.log(`Generating clue for: "${inspiration}"`);
  const result = await generateVerifiedAnagramClue(apiKey, {
    inspiration,
    difficulty: "easy",
  });

  if ("error" in result) {
    console.error("Generation failed:", result.error);
    process.exit(1);
  }

  const ind =
    result.clue.anagramIndicator?.trim() ||
    extractIndicatorFromClue(result.clue.clue) ||
    "";
  console.log(`Clue: ${result.clue.clue}`);
  console.log(`Indicator: "${ind}"`);
  console.log(`Strategy: ${result.strategy}, LLM calls: ${result.llmCalls}`);

  const indKey = normalizeIndicatorKey(ind);
  const uses = archiveCounts.get(indKey) ?? 0;
  const isHot = isHotArchiveIndicator(ind, archiveCounts);

  if (isHot) {
    console.warn(
      `WARNING: Generated hot archive indicator "${ind}" (${uses} prior uses) — swap pass may have failed or was unavoidable`
    );
  } else if (uses === 0) {
    console.log("OK: Indicator never seen in archive before");
  } else {
    console.log(`OK: Indicator used ${uses} time(s) in archive (below hot threshold)`);
  }

  const refinePrompts = result.prompts?.indicatorRefine ?? [];
  const polishPrompts = result.prompts?.templatePolish ?? [];
  if (polishPrompts.length > 0) {
    assert.match(
      polishPrompts[0].user,
      /PREFER \(rare in our archive/,
      "live polish prompt should include PREFER"
    );
  }
  console.log(`Polish prompts: ${polishPrompts.length}, refine prompts: ${refinePrompts.length}`);
} else {
  console.log("\n(Skip live Claude test — pass --live to run full pipeline)");
}

console.log("\n✓ Indicator variety verification passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
