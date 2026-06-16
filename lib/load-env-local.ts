import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Load `.env.local` for standalone scripts (Next.js loads it automatically in the app). */
export function loadEnvLocal(cwd = process.cwd()): void {
  const path = join(cwd, ".env.local");
  if (!existsSync(path)) return;

  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    process.env[key] = value;
  }
}
