import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NextResponse } from "next/server";

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
    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      window_start INTEGER NOT NULL
    );
  `);

  return db;
}

export interface RateLimitOptions {
  /** Unique bucket id, e.g. "login:1.2.3.4" */
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { key, limit, windowMs } = options;
  const now = Date.now();
  const database = getDb();

  const row = database
    .prepare(`SELECT count, window_start FROM rate_limits WHERE bucket = ?`)
    .get(key) as { count: number; window_start: number } | undefined;

  if (!row || now - row.window_start >= windowMs) {
    database
      .prepare(
        `INSERT INTO rate_limits (bucket, count, window_start) VALUES (?, 1, ?)
         ON CONFLICT(bucket) DO UPDATE SET count = 1, window_start = excluded.window_start`
      )
      .run(key, now);

    return { allowed: true, limit, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (row.count >= limit) {
    const retryAfterSec = Math.ceil((row.window_start + windowMs - now) / 1000);
    return { allowed: false, limit, remaining: 0, retryAfterSec };
  }

  database
    .prepare(`UPDATE rate_limits SET count = count + 1 WHERE bucket = ?`)
    .run(key);

  return {
    allowed: true,
    limit,
    remaining: limit - row.count - 1,
    retryAfterSec: 0,
  };
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, result.retryAfterSec)),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

/** Apply a rate limit; returns a 429 response when exceeded. */
export function enforceRateLimit(options: RateLimitOptions): NextResponse | null {
  const result = checkRateLimit(options);
  if (!result.allowed) return rateLimitResponse(result);
  return null;
}
