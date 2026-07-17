import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { isContentSafeHomophonePair } from "@/lib/homophone-content-filter";

const dbPath =
  process.env.DATABASE_PATH ?? join(process.cwd(), "data", "clues.db");
const db = new DatabaseSync(dbPath);

const rows = db
  .prepare(
    `SELECT word_a, word_b, definition_a, definition_b FROM homophone_pairs`
  )
  .all() as Array<{
  word_a: string;
  word_b: string;
  definition_a: string;
  definition_b: string;
}>;

const del = db.prepare(
  `DELETE FROM homophone_pairs WHERE word_a = ? AND word_b = ?`
);

let removed = 0;
for (const row of rows) {
  if (
    isContentSafeHomophonePair(
      row.word_a,
      row.word_b,
      row.definition_a,
      row.definition_b
    )
  ) {
    continue;
  }
  console.log(`removing ${row.word_a}/${row.word_b}`);
  del.run(row.word_a, row.word_b);
  removed++;
}

db.exec(`
  DELETE FROM homophone_word_synonyms
  WHERE word NOT IN (
    SELECT word_a FROM homophone_pairs
    UNION
    SELECT word_b FROM homophone_pairs
  )
`);

const left = db
  .prepare("SELECT COUNT(*) AS c FROM homophone_pairs")
  .get() as { c: number };

console.log(`Removed ${removed} pair(s); ${left.c} remaining.`);
