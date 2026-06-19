import assert from "node:assert/strict";
import {
  buildIndicatorGuidance,
  HOT_INDICATOR_THRESHOLD,
  invalidateIndicatorUsageCache,
} from "../lib/indicator-archive-weights";
import {
  indicatorSurfaceScore,
  normalizeIndicatorKey,
} from "../lib/anagram-indicators";
import { archiveClue, searchArchivedClues } from "../lib/db/clue-archive";
import { join } from "node:path";
import { unlinkSync } from "node:fs";

const testDb = join(process.cwd(), "data", "test-indicator-weights.db");
process.env.DATABASE_PATH = testDb;

try {
  unlinkSync(testDb);
} catch {
  // fresh db
}

invalidateIndicatorUsageCache();

for (let i = 0; i < HOT_INDICATOR_THRESHOLD; i++) {
  archiveClue({
    inspiration: `Theme ${i}`,
    difficulty: "easy",
    answer: "ALPHA",
    clue: `Sample clue twisted (${5})`,
    anagramFodder: "sample",
    anagramIndicator: "twisted",
    rating: 4,
  });
}

const guidance = buildIndicatorGuidance({
  themeAvoid: ["in chaos"],
  seed: "test-theme",
});

assert.ok(guidance.hot.includes("twisted"), "twisted should be hot");
assert.ok(guidance.avoid.includes("twisted"), "twisted should be avoided");
assert.ok(guidance.avoid.includes("in chaos"), "theme avoid should remain");
assert.ok(
  guidance.prefer.length > 0,
  "prefer list should suggest cold indicators"
);
assert.ok(
  !guidance.prefer.some((p) => normalizeIndicatorKey(p) === "twisted"),
  "prefer list should exclude hot indicators"
);

const coldScore = indicatorSurfaceScore(
  "in chaos",
  guidance.avoid,
  guidance.archiveCounts
);
const hotScore = indicatorSurfaceScore(
  "twisted",
  guidance.avoid,
  guidance.archiveCounts
);
assert.ok(coldScore > hotScore, "cold indicators should score higher");

assert.equal(searchArchivedClues({ limit: 10 }).length, HOT_INDICATOR_THRESHOLD);

console.log("indicator archive weight tests passed");
