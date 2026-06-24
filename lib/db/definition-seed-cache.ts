import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { normalizeInspirationKey } from "@/lib/db/clue-archive";

let db: DatabaseSync | null = null;

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
    CREATE TABLE IF NOT EXISTS definition_seed_cache (
      inspiration_key TEXT PRIMARY KEY,
      inspiration TEXT NOT NULL,
      seeds_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

function parseSeedsJson(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Cached Claude definition seeds for an inspiration (null if never fetched). */
export function getCachedDefinitionSeeds(inspiration: string): string[] | null {
  const key = normalizeInspirationKey(inspiration);
  if (!key) return null;

  const row = getDb()
    .prepare(
      `SELECT seeds_json FROM definition_seed_cache WHERE inspiration_key = ?`
    )
    .get(key) as { seeds_json: string } | undefined;

  if (!row) return null;
  const seeds = parseSeedsJson(row.seeds_json);
  return seeds.length > 0 ? seeds : null;
}

export function saveCachedDefinitionSeeds(
  inspiration: string,
  seeds: string[]
): void {
  const trimmed = inspiration.trim();
  const key = normalizeInspirationKey(trimmed);
  if (!key || seeds.length === 0) return;

  getDb()
    .prepare(
      `INSERT INTO definition_seed_cache (inspiration_key, inspiration, seeds_json)
       VALUES (?, ?, ?)
       ON CONFLICT(inspiration_key) DO UPDATE SET
         inspiration = excluded.inspiration,
         seeds_json = excluded.seeds_json,
         created_at = datetime('now')`
    )
    .run(key, trimmed, JSON.stringify(seeds));
}
