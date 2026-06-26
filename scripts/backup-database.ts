import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_RETENTION_DAYS = 14;

function databasePath(): string {
  return process.env.DATABASE_PATH ?? join(process.cwd(), "data", "clues.db");
}

function backupDirectory(): string {
  return (
    process.env.BACKUP_DIR?.trim() ||
    join(dirname(databasePath()), "backups")
  );
}

function pruneOldBackups(dir: string, retentionDays: number): void {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  for (const name of readdirSync(dir)) {
    if (!name.startsWith("clues-") || !name.endsWith(".db")) continue;
    const path = join(dir, name);
    const mtime = statSync(path).mtimeMs;
    if (mtime < cutoff) {
      unlinkSync(path);
      console.log("Removed old backup:", path);
    }
  }
}

function backupDatabase(source: string, dest: string): void {
  if (!existsSync(source)) {
    throw new Error(`Database not found: ${source}`);
  }

  const escapedDest = dest.replace(/'/g, "''");

  try {
    const database = new DatabaseSync(source, { readonly: true });
    database.exec(`VACUUM INTO '${escapedDest}'`);
    database.close();
    return;
  } catch (err) {
    console.warn(
      "SQLite VACUUM INTO failed, falling back to file copy:",
      err instanceof Error ? err.message : err
    );
    copyFileSync(source, dest);
  }
}

function main(): void {
  const source = databasePath();
  const destDir = backupDirectory();
  mkdirSync(destDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = join(destDir, `clues-${stamp}.db`);

  backupDatabase(source, dest);

  const sizeKb = Math.round(statSync(dest).size / 1024);
  console.log(`Backup written: ${dest} (${sizeKb} KB)`);

  const retention = Number(
    process.env.BACKUP_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS
  );
  if (Number.isFinite(retention) && retention > 0) {
    pruneOldBackups(destDir, retention);
  }
}

try {
  main();
} catch (err) {
  console.error(
    "Backup failed:",
    err instanceof Error ? err.message : err
  );
  process.exit(1);
}
