import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { FREE_SPINS } from "@/lib/auth/constants";
import type { CreditsStatus, UserPublic } from "@/lib/types";

export interface UserRecord extends UserPublic {
  passwordHash: string;
  freeSpinsUsed: number;
  credits: number;
}

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
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      free_spins_used INTEGER NOT NULL DEFAULT 0,
      credits INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function rowToUser(row: Record<string, unknown>): UserRecord {
  return {
    id: Number(row.id),
    email: row.email as string,
    passwordHash: row.password_hash as string,
    freeSpinsUsed: Number(row.free_spins_used),
    credits: Number(row.credits),
  };
}

export function toPublicUser(user: UserRecord): UserPublic {
  return { id: user.id, email: user.email };
}

export function getCreditsStatus(user: UserRecord): CreditsStatus {
  const freeRemaining = Math.max(0, FREE_SPINS - user.freeSpinsUsed);
  const paidCredits = user.credits;
  return {
    freeRemaining,
    paidCredits,
    canGenerate: freeRemaining > 0 || paidCredits > 0,
  };
}

export function findUserByEmail(email: string): UserRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM users WHERE email = ? COLLATE NOCASE`)
    .get(email.trim()) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : null;
}

export function findUserById(id: number): UserRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : null;
}

export function createUser(email: string, passwordHash: string): UserRecord {
  const normalized = email.trim().toLowerCase();
  const database = getDb();
  const info = database
    .prepare(`INSERT INTO users (email, password_hash) VALUES (?, ?)`)
    .run(normalized, passwordHash);

  const created = findUserById(Number(info.lastInsertRowid));
  if (!created) throw new Error("Failed to create user");
  return created;
}

/** Consume one free spin or paid credit after a verified clue with successful Claude usage. */
export function consumeGenerationCredit(userId: number): CreditsStatus {
  const database = getDb();
  const user = findUserById(userId);
  if (!user) throw new Error("User not found");

  const status = getCreditsStatus(user);
  if (!status.canGenerate) {
    throw new Error("No credits remaining");
  }

  if (status.freeRemaining > 0) {
    const info = database
      .prepare(
        `UPDATE users SET free_spins_used = free_spins_used + 1 WHERE id = ? AND free_spins_used < ?`
      )
      .run(userId, FREE_SPINS);
    if (info.changes === 0) throw new Error("No credits remaining");
  } else {
    const info = database
      .prepare(`UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0`)
      .run(userId);
    if (info.changes === 0) throw new Error("No credits remaining");
  }

  const updated = findUserById(userId);
  if (!updated) throw new Error("User not found");
  return getCreditsStatus(updated);
}

export function addCredits(userId: number, amount: number): CreditsStatus {
  if (amount <= 0) throw new Error("Credit amount must be positive");
  getDb()
    .prepare(`UPDATE users SET credits = credits + ? WHERE id = ?`)
    .run(amount, userId);

  const user = findUserById(userId);
  if (!user) throw new Error("User not found");
  return getCreditsStatus(user);
}
