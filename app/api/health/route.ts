import { NextRequest, NextResponse } from "next/server";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const runtime = "nodejs";

function databasePath(): string {
  return process.env.DATABASE_PATH ?? join(process.cwd(), "data", "clues.db");
}

function checkDatabase(): { ok: boolean; detail?: string } {
  try {
    const path = databasePath();
    mkdirSync(dirname(path), { recursive: true });
    const db = new DatabaseSync(path);
    db.prepare("SELECT 1").get();
    db.close();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "Database unreachable",
    };
  }
}

function requiredEnv(keys: string[]): string[] {
  return keys.filter((key) => !process.env[key]?.trim());
}

export async function GET() {
  const missing = requiredEnv([
    "ANTHROPIC_API_KEY",
    "SESSION_SECRET",
    "APP_URL",
  ]);

  const db = checkDatabase();

  const ok = missing.length === 0 && db.ok;

  return NextResponse.json(
    {
      ok,
      checks: {
        database: db,
        env: {
          ok: missing.length === 0,
          missing: missing.length ? missing : undefined,
        },
        stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
        resend: Boolean(process.env.RESEND_API_KEY?.trim()),
        sentry: Boolean(process.env.SENTRY_DSN?.trim()),
      },
    },
    { status: ok ? 200 : 503 }
  );
}
