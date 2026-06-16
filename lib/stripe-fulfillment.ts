import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type Stripe from "stripe";
import { addCredits, findUserById, getCreditsStatus, type UserRecord } from "@/lib/db/users";
import type { CreditsStatus } from "@/lib/types";
import { getStripe } from "@/lib/stripe";

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
    CREATE TABLE IF NOT EXISTS stripe_fulfillments (
      session_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      fulfilled_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function isFulfilled(sessionId: string): boolean {
  const row = getDb()
    .prepare(`SELECT 1 FROM stripe_fulfillments WHERE session_id = ?`)
    .get(sessionId);
  return Boolean(row);
}

function markFulfilled(sessionId: string, userId: number, credits: number): void {
  getDb()
    .prepare(
      `INSERT INTO stripe_fulfillments (session_id, user_id, credits) VALUES (?, ?, ?)`
    )
    .run(sessionId, userId, credits);
}

/** Idempotent: grant credits once per Checkout session. */
export function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
  expectedUserId?: number
): { credits: CreditsStatus; user: UserRecord } | null {
  if (session.payment_status !== "paid") return null;

  const sessionId = session.id;
  if (!sessionId || isFulfilled(sessionId)) {
    if (!sessionId) return null;
    const userId = Number(session.metadata?.userId);
    const user = Number.isFinite(userId) ? findUserById(userId) : null;
    if (!user) return null;
    return { user, credits: getCreditsStatus(user) };
  }

  const userId = Number(session.metadata?.userId);
  const credits = Number(session.metadata?.credits);

  if (!Number.isFinite(userId) || userId <= 0) return null;
  if (!Number.isFinite(credits) || credits <= 0) return null;
  if (expectedUserId !== undefined && userId !== expectedUserId) return null;

  const user = findUserById(userId);
  if (!user) return null;

  markFulfilled(sessionId, userId, credits);
  const status = addCredits(userId, credits);
  const updated = findUserById(userId);
  if (!updated) return null;

  return { user: updated, credits: status };
}

export async function fulfillCheckoutSessionById(
  sessionId: string,
  expectedUserId?: number
): Promise<{ credits: CreditsStatus; user: UserRecord } | null> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  return fulfillCheckoutSession(session, expectedUserId);
}
