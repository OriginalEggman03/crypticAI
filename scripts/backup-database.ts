import { copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";

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

function main(): void {
  const source = databasePath();
  const destDir = backupDirectory();
  mkdirSync(destDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = join(destDir, `clues-${stamp}.db`);

  copyFileSync(source, dest);
  console.log("Backup written:", dest);

  const retention = Number(process.env.BACKUP_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS);
  if (Number.isFinite(retention) && retention > 0) {
    pruneOldBackups(destDir, retention);
  }
}

main();
