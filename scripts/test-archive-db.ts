import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const testDb = join(process.cwd(), "data", "test-clues.db");
  process.env.DATABASE_PATH = testDb;

  try {
    rmSync(testDb, { force: true });
  } catch {
    // fresh test
  }

  const { archiveClue, searchArchivedClues } = await import(
    "../lib/db/clue-archive"
  );

  const saved = archiveClue({
    inspiration: "Mortal Kombat characters",
    difficulty: "hard",
    answer: "SCORPION",
    clue: "Venomous fighter oddly broken (8)",
    anagramFodder: "poison rc",
    rating: 5,
  });

  assert.equal(saved.rating, 5);

  archiveClue({
    inspiration: "jazz and coffee",
    difficulty: "easy",
    answer: "BEAN",
    clue: "Short test clue (4)",
    anagramFodder: "bane",
    rating: 3,
  });

  const byInspiration = searchArchivedClues({ inspiration: "kombat" });
  assert.equal(byInspiration.length, 1);
  assert.equal(byInspiration[0].answer, "SCORPION");

  const byDifficulty = searchArchivedClues({ difficulty: "easy" });
  assert.equal(byDifficulty.length, 1);

  const byRating = searchArchivedClues({ rating: 5 });
  assert.equal(byRating.length, 1);

  const combined = searchArchivedClues({
    inspiration: "jazz",
    difficulty: "easy",
    minRating: 3,
  });
  assert.equal(combined.length, 1);

  console.log("archive db tests passed");

  rmSync(testDb, { force: true });
}

main();
