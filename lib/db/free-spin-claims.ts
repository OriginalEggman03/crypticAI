import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

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
    CREATE TABLE IF NOT EXISTS free_spin_claims (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      free_spins_used INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const usersTable = db
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'`
    )
    .get();

  if (usersTable) {
    db.exec(`
      INSERT INTO free_spin_claims (email, free_spins_used, updated_at)
      SELECT LOWER(TRIM(email)), free_spins_used, datetime('now')
      FROM users
      WHERE free_spins_used > 0
      ON CONFLICT(email) DO UPDATE SET
        free_spins_used = MAX(free_spin_claims.free_spins_used, excluded.free_spins_used),
        updated_at = excluded.updated_at
    `);
  }

  return db;
}

export function normalizeClaimEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Lifetime free spins consumed for this email (survives account deletion). */
export function getLifetimeFreeSpinsUsed(email: string): number {
  const row = getDb()
    .prepare(`SELECT free_spins_used FROM free_spin_claims WHERE email = ? COLLATE NOCASE`)
    .get(normalizeClaimEmail(email)) as { free_spins_used: number } | undefined;

  return row ? Number(row.free_spins_used) : 0;
}

/** Record lifetime usage; keeps the higher of existing and new values. */
export function setLifetimeFreeSpinsUsed(email: string, used: number): void {
  const normalized = normalizeClaimEmail(email);
  const value = Math.max(0, Math.floor(used));

  getDb()
    .prepare(
      `INSERT INTO free_spin_claims (email, free_spins_used, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(email) DO UPDATE SET
         free_spins_used = MAX(free_spin_claims.free_spins_used, excluded.free_spins_used),
         updated_at = excluded.updated_at`
    )
    .run(normalized, value);
}
