import { execSync } from "node:child_process";

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] }).trim();
}

function setVar(key: string, value: string, service?: string): void {
  const serviceFlag = service ? ` --service ${service}` : "";
  execSync(`railway variable set ${key} --stdin --skip-deploys${serviceFlag}`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

const backupService = process.env.RAILWAY_BACKUP_SERVICE?.trim() || "crypticAI-backup";

console.log("Configuring database backup on Railway...\n");

try {
  setVar("BACKUP_DIR", "/data/backups");
  setVar("BACKUP_RETENTION_DAYS", "14");
  console.log("✓ Set BACKUP_DIR and BACKUP_RETENTION_DAYS on the linked service.");
} catch (err) {
  console.error("Could not set variables on linked service. Run `railway link` first.");
  throw err;
}

console.log(`
Next: create a dedicated backup cron service (one-time, in Railway dashboard):

1. In your crypticAI Railway project → **+ New** → **GitHub Repo** → same \`crypticAI\` repo.
2. Name the service: **${backupService}**
3. **Settings** → **Config-as-code** → set config file path to: \`railway.backup.toml\`
4. **Volumes** → attach the **same volume** as production (mount path \`/data\`).
5. **Variables** (copy from main service, minimum):
   - DATABASE_PATH=/data/clues.db
   - BACKUP_DIR=/data/backups
   - BACKUP_RETENTION_DAYS=14
6. **Settings** → confirm **Cron Schedule** shows \`0 3 * * 0\` (Sundays 03:00 UTC).
7. Deploy the backup service once.

Manual test (uses production volume via CLI):
  railway run --service ${backupService} npm run backup:db

Or test on the linked web service:
  railway run npm run backup:db

Backups are written to /data/backups/ on the volume. Copy them off-site regularly.
`);

try {
  const status = run("railway status");
  console.log("Current linked service:\n", status);
} catch {
  // optional
}
