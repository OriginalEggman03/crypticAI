import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  buildHomophonePairsFromCmu,
  type HomophonePairBuild,
} from "@/lib/homophone-pair-build";
import { normalizeHomophoneWord } from "@/lib/homophone-phonetics";
import {
  haveIdenticalSpelling,
  isDistinctHomophonePair,
} from "@/lib/homophone-variants";

let db: DatabaseSync | null = null;
let buildPromise: Promise<{ pairs: number; words: number }> | null = null;
let synonymBuildPromise: Promise<{ words: number }> | null = null;

function databasePath(): string {
  return process.env.DATABASE_PATH ?? join(process.cwd(), "data", "clues.db");
}

function getDb(): DatabaseSync {
  if (db) return db;

  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });

  db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS homophone_pairs (
      word_a TEXT NOT NULL,
      word_b TEXT NOT NULL,
      definition_a TEXT NOT NULL,
      definition_b TEXT NOT NULL,
      part_of_speech_a TEXT,
      part_of_speech_b TEXT,
      phonetic_key TEXT NOT NULL,
      PRIMARY KEY (word_a, word_b),
      CHECK (word_a < word_b)
    );

    CREATE INDEX IF NOT EXISTS idx_homophone_pairs_word_a ON homophone_pairs(word_a);
    CREATE INDEX IF NOT EXISTS idx_homophone_pairs_word_b ON homophone_pairs(word_b);

    CREATE TABLE IF NOT EXISTS homophone_word_synonyms (
      word TEXT PRIMARY KEY,
      synonyms TEXT NOT NULL
    );
  `);

  migrateLegacyHomophoneTables(db);

  return db;
}

function migrateLegacyHomophoneTables(database: DatabaseSync): void {
  const legacyGroups = database
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name IN ('homophone_groups', 'homophone_words')`
    )
    .all() as { name: string }[];

  if (legacyGroups.length === 0) return;

  database.exec("DROP TABLE IF EXISTS homophone_words");
  database.exec("DROP TABLE IF EXISTS homophone_groups");
}

function homophonePairCount(database: DatabaseSync): number {
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM homophone_pairs")
    .get() as { count: number };
  return row.count;
}

function insertHomophonePairs(
  database: DatabaseSync,
  pairs: HomophonePairBuild[]
): { pairs: number; words: number } {
  database.exec("DELETE FROM homophone_pairs");

  const insertPair = database.prepare(
    `INSERT INTO homophone_pairs (
      word_a, word_b, definition_a, definition_b,
      part_of_speech_a, part_of_speech_b, phonetic_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const words = new Set<string>();
  for (const pair of pairs) {
    if (haveIdenticalSpelling(pair.wordA, pair.wordB)) {
      throw new Error(
        `Refusing homophone pair with identical spelling: ${pair.wordA}/${pair.wordB}`
      );
    }
    if (!isDistinctHomophonePair(pair.wordA, pair.wordB)) {
      throw new Error(
        `Refusing invalid homophone pair: ${pair.wordA}/${pair.wordB}`
      );
    }

    insertPair.run(
      pair.wordA,
      pair.wordB,
      pair.definitionA,
      pair.definitionB,
      pair.partOfSpeechA ?? null,
      pair.partOfSpeechB ?? null,
      pair.phoneticKey
    );
    words.add(pair.wordA);
    words.add(pair.wordB);
  }

  return { pairs: pairs.length, words: words.size };
}

function listHomophoneDictionaryWords(database: DatabaseSync): string[] {
  if (homophonePairCount(database) === 0) return [];

  const rows = database
    .prepare(
      `SELECT DISTINCT word FROM (
        SELECT word_a AS word FROM homophone_pairs
        UNION
        SELECT word_b AS word FROM homophone_pairs
      ) ORDER BY word COLLATE NOCASE`
    )
    .all() as { word: string }[];

  return rows.map((row) => row.word);
}

function homophoneSynonymCount(database: DatabaseSync): number {
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM homophone_word_synonyms")
    .get() as { count: number };
  return row.count;
}

/** Populate synonym table for every homophone lexicon word (idempotent — clears and rebuilds). */
export async function rebuildHomophoneSynonyms(options?: {
  fetchRemote?: boolean;
}): Promise<{ words: number }> {
  const { gatherHomophoneSynonyms, gatherHomophoneSynonymsLocal } =
    await import("@/lib/homophone-synonym-populate");

  const database = getDb();
  const words = listHomophoneDictionaryWords(database);
  const fetchRemote = options?.fetchRemote !== false;

  database.exec("DELETE FROM homophone_word_synonyms");
  const insert = database.prepare(
    `INSERT INTO homophone_word_synonyms (word, synonyms) VALUES (?, ?)`
  );

  let stored = 0;
  for (const word of words) {
    const synonyms = fetchRemote
      ? await gatherHomophoneSynonyms(word)
      : gatherHomophoneSynonymsLocal(word);
    if (synonyms.length === 0) continue;
    insert.run(word, JSON.stringify(synonyms));
    stored++;
  }

  return { words: stored };
}

/** Stored synonym hints for a homophone lexicon word. */
export function getHomophoneSynonyms(word: string): string[] {
  const normalized = normalizeHomophoneWord(word);
  if (!normalized) return [];

  const database = getDb();
  const row = database
    .prepare("SELECT synonyms FROM homophone_word_synonyms WHERE word = ?")
    .get(normalized) as { synonyms: string } | undefined;

  if (!row?.synonyms) return [];

  try {
    const parsed = JSON.parse(row.synonyms) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export async function ensureHomophoneSynonyms(): Promise<void> {
  const database = getDb();
  if (homophonePairCount(database) === 0) return;
  if (homophoneSynonymCount(database) > 0) return;

  if (!synonymBuildPromise) {
    synonymBuildPromise = rebuildHomophoneSynonyms({ fetchRemote: false });
  }

  await synonymBuildPromise;
}

/** Populate homophone pair table from CMUdict (idempotent — clears and rebuilds). */
export async function rebuildHomophoneDatabase(): Promise<{
  pairs: number;
  words: number;
}> {
  const database = getDb();
  const pairs = await buildHomophonePairsFromCmu();
  const stats = insertHomophonePairs(database, pairs);
  synonymBuildPromise = rebuildHomophoneSynonyms({ fetchRemote: true });
  await synonymBuildPromise;
  return stats;
}

export async function ensureHomophoneDatabase(): Promise<void> {
  const database = getDb();
  if (homophonePairCount(database) > 0) return;

  if (!buildPromise) {
    buildPromise = rebuildHomophoneDatabase();
  }

  await buildPromise;
}

export function getHomophoneStats(): {
  pairs: number;
  words: number;
  /** @deprecated Use pairs — kept for transitional logging. */
  groups: number;
} {
  const database = getDb();
  const pairs = homophonePairCount(database);
  const words = (
    database
      .prepare(
        `SELECT COUNT(*) AS count FROM (
          SELECT word_a AS word FROM homophone_pairs
          UNION
          SELECT word_b AS word FROM homophone_pairs
        )`
      )
      .get() as { count: number }
  ).count;
  return { pairs, words, groups: pairs };
}

/** Dictionary definition stored at pair-build time for a homophone lexicon word. */
export function getStoredHomophoneDefinition(
  word: string
): { definition: string; partOfSpeech?: string } | null {
  const normalized = normalizeHomophoneWord(word);
  if (!normalized) return null;

  const database = getDb();
  if (homophonePairCount(database) === 0) return null;

  const row = database
    .prepare(
      `SELECT word_a, word_b, definition_a, definition_b,
              part_of_speech_a, part_of_speech_b
       FROM homophone_pairs
       WHERE word_a = ? OR word_b = ?
       LIMIT 1`
    )
    .get(normalized, normalized) as
    | {
        word_a: string;
        word_b: string;
        definition_a: string;
        definition_b: string;
        part_of_speech_a: string | null;
        part_of_speech_b: string | null;
      }
    | undefined;

  if (!row) return null;

  if (row.word_a === normalized) {
    return {
      definition: row.definition_a,
      partOfSpeech: row.part_of_speech_a ?? undefined,
    };
  }

  return {
    definition: row.definition_b,
    partOfSpeech: row.part_of_speech_b ?? undefined,
  };
}

/** All words that sound like `word` (excluding the word itself). */
export function getHomophonePartners(word: string): string[] {
  const normalized = normalizeHomophoneWord(word);
  if (!normalized) return [];

  const database = getDb();
  if (homophonePairCount(database) === 0) return [];

  const rows = database
    .prepare(
      `SELECT word_b AS partner FROM homophone_pairs WHERE word_a = ?
       UNION
       SELECT word_a AS partner FROM homophone_pairs WHERE word_b = ?
       ORDER BY partner COLLATE NOCASE`
    )
    .all(normalized, normalized) as { partner: string }[];

  return rows
    .map((row) => row.partner)
    .filter((partner) => isDistinctHomophonePair(normalized, partner));
}

/** All explicit homophone pairs containing `word`. */
export function getHomophonePairEntriesForWord(word: string): HomophonePairBuild[] {
  const normalized = normalizeHomophoneWord(word);
  if (!normalized) return [];

  const database = getDb();
  if (homophonePairCount(database) === 0) return [];

  const rows = database
    .prepare(
      `SELECT word_a, word_b, definition_a, definition_b,
              part_of_speech_a, part_of_speech_b, phonetic_key
       FROM homophone_pairs
       WHERE word_a = ? OR word_b = ?
       ORDER BY word_a COLLATE NOCASE, word_b COLLATE NOCASE`
    )
    .all(normalized, normalized) as Array<{
      word_a: string;
      word_b: string;
      definition_a: string;
      definition_b: string;
      part_of_speech_a: string | null;
      part_of_speech_b: string | null;
      phonetic_key: string;
    }>;

  return rows.map((row) => ({
    wordA: row.word_a,
    wordB: row.word_b,
    definitionA: row.definition_a,
    definitionB: row.definition_b,
    partOfSpeechA: row.part_of_speech_a ?? undefined,
    partOfSpeechB: row.part_of_speech_b ?? undefined,
    phoneticKey: row.phonetic_key,
  }));
}

/** @deprecated Groups are now explicit pairs — returns partner lists per pronunciation key. */
export function getHomophoneGroupsForWord(word: string): string[][] {
  const normalized = normalizeHomophoneWord(word);
  if (!normalized) return [];

  const database = getDb();
  const rows = database
    .prepare(
      `SELECT phonetic_key AS phoneticKey,
              GROUP_CONCAT(
                CASE WHEN word_a = ? THEN word_b ELSE word_a END
              ) AS partners
       FROM homophone_pairs
       WHERE word_a = ? OR word_b = ?
       GROUP BY phonetic_key`
    )
    .all(normalized, normalized, normalized) as Array<{
      phoneticKey: string;
      partners: string;
    }>;

  return rows.map((row) => {
    const partners = row.partners
      ? row.partners.split(",").map((partner) => partner.trim())
      : [];
    return [normalized, ...partners].sort((a, b) => a.localeCompare(b));
  });
}

/** True when the word appears in at least one validated homophone pair. */
export function hasHomophones(word: string): boolean {
  return getHomophonePartners(word).length > 0;
}

/** Distinct homophone-dictionary words within letter-length bounds. */
export function listHomophoneLexiconWords(
  minLength: number,
  maxLength: number
): string[] {
  const database = getDb();
  if (homophonePairCount(database) === 0) return [];

  const rows = database
    .prepare(
      `SELECT DISTINCT word FROM (
        SELECT word_a AS word FROM homophone_pairs
        UNION
        SELECT word_b AS word FROM homophone_pairs
      )
      WHERE LENGTH(word) >= ? AND LENGTH(word) <= ?
      ORDER BY word COLLATE NOCASE`
    )
    .all(minLength, maxLength) as { word: string }[];

  return rows.map((row) => row.word);
}
