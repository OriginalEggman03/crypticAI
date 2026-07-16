import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import {
  normalizeHomophoneWord,
  shareHomophonePronunciation,
} from "@/lib/homophone-phonetics";
import {
  haveIdenticalSpelling,
  isDistinctHomophonePair,
  normalizeHomophoneSpelling,
  normalizeSpellingVariantKey,
} from "@/lib/homophone-variants";

export function runHomophonePairsIntegrityCheck(): number {
  let failed = 0;

  function assert(condition: boolean, label: string): void {
    if (!condition) {
      failed++;
      console.error(`FAIL ${label}`);
    } else {
      console.log(`OK   ${label}`);
    }
  }

  const dbPath =
    process.env.DATABASE_PATH ?? join(process.cwd(), "data", "clues.db");
  const db = new DatabaseSync(dbPath);

  const rows = db
    .prepare(
      `SELECT word_a, word_b, definition_a, definition_b
       FROM homophone_pairs
       ORDER BY word_a COLLATE NOCASE, word_b COLLATE NOCASE`
    )
    .all() as Array<{
    word_a: string;
    word_b: string;
    definition_a: string;
    definition_b: string;
  }>;

  console.log(`Checking ${rows.length} homophone pairs for spelling integrity.`);

  const sameSpellingPairs: Array<{ word_a: string; word_b: string }> = [];
  const sameNormalizedPairs: Array<{ word_a: string; word_b: string }> = [];
  const invalidDistinctPairs: Array<{ word_a: string; word_b: string }> = [];
  const phoneticMismatchPairs: Array<{ word_a: string; word_b: string }> = [];

  for (const row of rows) {
    const { word_a, word_b } = row;

    if (word_a.toLowerCase() === word_b.toLowerCase()) {
      sameSpellingPairs.push({ word_a, word_b });
    }

    if (haveIdenticalSpelling(word_a, word_b)) {
      sameNormalizedPairs.push({ word_a, word_b });
      continue;
    }

    const normA = normalizeHomophoneWord(word_a);
    const normB = normalizeHomophoneWord(word_b);
    if (normA && normB && normA === normB) {
      sameNormalizedPairs.push({ word_a, word_b });
    }

    if (!isDistinctHomophonePair(word_a, word_b)) {
      invalidDistinctPairs.push({ word_a, word_b });
    }

    if (!shareHomophonePronunciation(word_a, word_b)) {
      phoneticMismatchPairs.push({ word_a, word_b });
    }
  }

  assert(
    sameSpellingPairs.length === 0,
    `no pairs with identical case-insensitive spelling (found ${sameSpellingPairs.length})`
  );
  assert(
    sameNormalizedPairs.length === 0,
    `no pairs with identical normalized spelling (found ${sameNormalizedPairs.length})`
  );
  assert(
    invalidDistinctPairs.length === 0,
    `all pairs pass isDistinctHomophonePair (found ${invalidDistinctPairs.length})`
  );
  assert(
    phoneticMismatchPairs.length === 0,
    `all pairs share primary CMU pronunciation (found ${phoneticMismatchPairs.length})`
  );

  assert(
    !rows.some((row) => row.word_a === "shilling" && row.word_b === "shilling"),
    "shilling/shilling is not stored"
  );
  assert(
    !rows.some(
      (row) =>
        (row.word_a === "schilling" && row.word_b === "shilling") ||
        (row.word_a === "shilling" && row.word_b === "schilling")
    ),
    "schilling/shilling is not stored"
  );
  assert(
    !rows.some(
      (row) =>
        (row.word_a === "krona" && row.word_b === "krone") ||
        (row.word_a === "krone" && row.word_b === "krona")
    ),
    "krona/krone is not stored"
  );
  assert(
    !rows.some(
      (row) =>
        (row.word_a === "bally" && row.word_b === "bailey") ||
        (row.word_a === "bailey" && row.word_b === "bally")
    ),
    "bally/bailey is not stored (different primary vowels AE vs EY)"
  );

  const variantKeyDuplicates = rows.filter(
    (row) =>
      !haveIdenticalSpelling(row.word_a, row.word_b) &&
      normalizeSpellingVariantKey(row.word_a) ===
        normalizeSpellingVariantKey(row.word_b)
  );
  if (variantKeyDuplicates.length > 0) {
    console.log(
      `Note: ${variantKeyDuplicates.length} pairs share spelling-variant keys.`
    );
  }

  if (sameSpellingPairs.length > 0) {
    console.error(
      "Same-spelling pairs:",
      sameSpellingPairs.map((pair) => `${pair.word_a}/${pair.word_b}`).join(", ")
    );
  }

  if (sameNormalizedPairs.length > 0) {
    const examples = [
      ...new Map(
        sameNormalizedPairs.map((pair) => [
          `${normalizeHomophoneSpelling(pair.word_a)}|${normalizeHomophoneSpelling(pair.word_b)}`,
          pair,
        ])
      ).values(),
    ];
    console.error(
      "Same-normalized pairs:",
      examples.map((pair) => `${pair.word_a}/${pair.word_b}`).join(", ")
    );
  }

  if (invalidDistinctPairs.length > 0) {
    console.error(
      "Invalid distinct pairs:",
      invalidDistinctPairs
        .slice(0, 20)
        .map((pair) => `${pair.word_a}/${pair.word_b}`)
        .join(", ")
    );
  }

  if (phoneticMismatchPairs.length > 0) {
    console.error(
      "Phonetic mismatch pairs:",
      phoneticMismatchPairs
        .slice(0, 20)
        .map((pair) => `${pair.word_a}/${pair.word_b}`)
        .join(", ")
    );
  }

  return failed;
}

if (require.main === module) {
  const failed = runHomophonePairsIntegrityCheck();
  if (failed > 0) process.exit(1);
}
