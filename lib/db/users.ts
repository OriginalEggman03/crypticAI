import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { FREE_SPINS } from "@/lib/auth/constants";
import { isAdminUser } from "@/lib/admin";
import {
  getLifetimeFreeSpinsUsed,
  setLifetimeFreeSpinsUsed,
} from "@/lib/db/free-spin-claims";
import { hashVerificationToken } from "@/lib/auth/verification-token";
import type { CreditsStatus, UserPublic } from "@/lib/types";

export interface UserRecord extends UserPublic {
  passwordHash: string;
  freeSpinsUsed: number;
  credits: number;
  emailVerifiedAt: string | null;
  emailVerificationTokenHash: string | null;
  emailVerificationExpiresAt: string | null;
}

let db: DatabaseSync | null = null;

function databasePath(): string {
  return process.env.DATABASE_PATH ?? join(process.cwd(), "data", "clues.db");
}

function migrateUsersTable(database: DatabaseSync): void {
  const cols = database
    .prepare("PRAGMA table_info(users)")
    .all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("email_verified_at")) {
    database.exec(`ALTER TABLE users ADD COLUMN email_verified_at TEXT`);
    database.exec(
      `ALTER TABLE users ADD COLUMN email_verification_token_hash TEXT`
    );
    database.exec(
      `ALTER TABLE users ADD COLUMN email_verification_expires_at TEXT`
    );
    database.exec(
      `UPDATE users SET email_verified_at = datetime('now') WHERE email_verified_at IS NULL`
    );
  }
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
  migrateUsersTable(db);

  return db;
}

function rowToUser(row: Record<string, unknown>): UserRecord {
  return {
    id: Number(row.id),
    email: row.email as string,
    passwordHash: row.password_hash as string,
    freeSpinsUsed: Number(row.free_spins_used),
    credits: Number(row.credits),
    emailVerified: row.email_verified_at != null,
    emailVerifiedAt: (row.email_verified_at as string | null) ?? null,
    emailVerificationTokenHash:
      (row.email_verification_token_hash as string | null) ?? null,
    emailVerificationExpiresAt:
      (row.email_verification_expires_at as string | null) ?? null,
  };
}

export function isEmailVerified(user: UserRecord): boolean {
  return user.emailVerifiedAt != null;
}

export function toPublicUser(user: UserRecord): UserPublic {
  return {
    id: user.id,
    email: user.email,
    emailVerified: isEmailVerified(user),
  };
}

export function getCreditsStatus(user: UserRecord): CreditsStatus {
  if (isAdminUser(user)) {
    return {
      freeRemaining: 0,
      paidCredits: 0,
      canGenerate: true,
      adminUnlimited: true,
    };
  }

  const lifetimeUsed = getLifetimeFreeSpinsUsed(user.email);
  const effectiveUsed = Math.max(user.freeSpinsUsed, lifetimeUsed);
  const freeRemaining = Math.max(0, FREE_SPINS - effectiveUsed);
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
  return row ? ensureAdminVerified(rowToUser(row)) : null;
}

export function findUserById(id: number): UserRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return ensureAdminVerified(rowToUser(row));
}

/** Admin test account is always verified so login/generation is never blocked. */
function ensureAdminVerified(user: UserRecord): UserRecord {
  if (!isAdminUser(user) || isEmailVerified(user)) return user;

  getDb()
    .prepare(
      `UPDATE users
       SET email_verified_at = datetime('now'),
           email_verification_token_hash = NULL,
           email_verification_expires_at = NULL
       WHERE id = ?`
    )
    .run(user.id);

  return findUserByIdUnchecked(user.id) ?? user;
}

function findUserByIdUnchecked(id: number): UserRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : null;
}

export function createUser(
  email: string,
  passwordHash: string,
  verificationTokenHash: string,
  verificationExpiresAt: string
): UserRecord {
  const normalized = email.trim().toLowerCase();
  const database = getDb();
  const priorFreeSpinsUsed = getLifetimeFreeSpinsUsed(normalized);
  const info = database
    .prepare(
      `INSERT INTO users (
        email,
        password_hash,
        email_verification_token_hash,
        email_verification_expires_at,
        free_spins_used
      ) VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      normalized,
      passwordHash,
      verificationTokenHash,
      verificationExpiresAt,
      priorFreeSpinsUsed
    );

  const created = findUserById(Number(info.lastInsertRowid));
  if (!created) throw new Error("Failed to create user");
  return created;
}

export function setEmailVerificationToken(
  userId: number,
  tokenHash: string,
  expiresAt: string
): void {
  getDb()
    .prepare(
      `UPDATE users
       SET email_verification_token_hash = ?,
           email_verification_expires_at = ?
       WHERE id = ?`
    )
    .run(tokenHash, expiresAt, userId);
}

/** Replace password and verification token for a signup that was never verified. */
export function refreshUnverifiedSignup(
  userId: number,
  passwordHash: string,
  verificationTokenHash: string,
  verificationExpiresAt: string
): UserRecord | null {
  const info = getDb()
    .prepare(
      `UPDATE users
       SET password_hash = ?,
           email_verification_token_hash = ?,
           email_verification_expires_at = ?
       WHERE id = ? AND email_verified_at IS NULL`
    )
    .run(
      passwordHash,
      verificationTokenHash,
      verificationExpiresAt,
      userId
    );

  if (info.changes === 0) return null;
  return findUserById(userId);
}

export function verifyEmailWithToken(token: string): UserRecord | null {
  const tokenHash = hashVerificationToken(token);
  const user = getDb()
    .prepare(`SELECT * FROM users WHERE email_verification_token_hash = ?`)
    .get(tokenHash) as Record<string, unknown> | undefined;

  if (!user) return null;

  const record = rowToUser(user);
  if (isEmailVerified(record)) return record;

  if (
    !record.emailVerificationExpiresAt ||
    new Date(record.emailVerificationExpiresAt) < new Date()
  ) {
    return null;
  }

  getDb()
    .prepare(
      `UPDATE users
       SET email_verified_at = datetime('now'),
           email_verification_token_hash = NULL,
           email_verification_expires_at = NULL
       WHERE id = ?`
    )
    .run(record.id);

  return findUserById(record.id);
}

/** Consume one free spin or paid credit after a verified clue with successful Claude usage. */
export function consumeGenerationCredit(userId: number): CreditsStatus {
  const user = findUserById(userId);
  if (!user) throw new Error("User not found");

  if (isAdminUser(user)) {
    return getCreditsStatus(user);
  }

  const database = getDb();
  const status = getCreditsStatus(user);
  if (!status.canGenerate) {
    throw new Error("No credits remaining");
  }

  if (status.freeRemaining > 0) {
    const lifetimeUsed = getLifetimeFreeSpinsUsed(user.email);
    const effectiveUsed = Math.max(user.freeSpinsUsed, lifetimeUsed);
    const newUsed = effectiveUsed + 1;

    if (newUsed > FREE_SPINS) {
      throw new Error("No credits remaining");
    }

    const info = database
      .prepare(`UPDATE users SET free_spins_used = ? WHERE id = ?`)
      .run(newUsed, userId);
    if (info.changes === 0) throw new Error("No credits remaining");

    setLifetimeFreeSpinsUsed(user.email, newUsed);
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

export function deleteUserById(userId: number): boolean {
  const user = findUserById(userId);
  if (!user) return false;

  setLifetimeFreeSpinsUsed(
    user.email,
    Math.max(getLifetimeFreeSpinsUsed(user.email), user.freeSpinsUsed)
  );

  const info = getDb().prepare(`DELETE FROM users WHERE id = ?`).run(userId);
  return info.changes > 0;
}
