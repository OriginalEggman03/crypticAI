import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import {
  archiveClue,
  normalizeInspirationKey,
} from "../lib/db/clue-archive";
import { pickFallbackTheme } from "../lib/auto-inspiration";
import {
  isAnswerExcluded,
  mergeUsedClues,
} from "../lib/clue-history";
import { buildGenerationExcludeList } from "../lib/generation-exclude";

const testDb = join(process.cwd(), "data", "test-auto-inspiration.db");
process.env.DATABASE_PATH = testDb;

try {
  rmSync(testDb, { force: true });
} catch {
  // fresh test
}

archiveClue({
  inspiration: "Mortal Kombat characters",
  difficulty: "easy",
  answer: "RAIDEN",
  clue: "Test clue (5)",
  anagramFodder: "nadir",
  rating: 4,
});

const reused = pickFallbackTheme("test-seed");
assert.ok(reused.length >= 4);

const exclude = buildGenerationExcludeList("Mortal Kombat characters", []);
assert.equal(exclude.length, 1);
assert.ok(isAnswerExcluded("RAIDEN", exclude));
assert.ok(!isAnswerExcluded("SCORPION", exclude));

const withSession = buildGenerationExcludeList("Mortal Kombat characters", [
  {
    answer: "KANO",
    anagramFodder: "oak n",
    clue: "Session clue (4)",
  },
]);
assert.equal(withSession.length, 2);
assert.ok(isAnswerExcluded("KANO", withSession));

const merged = mergeUsedClues(exclude, [
  {
    answer: "RAIDEN",
    anagramFodder: "denari",
    clue: "Other wording (5)",
  },
]);
assert.equal(merged.length, 2);

assert.notEqual(
  normalizeInspirationKey(reused),
  normalizeInspirationKey("Mortal Kombat characters") ||
    reused.length >= 4
);

console.log("auto-inspiration tests passed:", reused);

try {
  rmSync(testDb, { force: true });
} catch {
  // Windows file lock
}
