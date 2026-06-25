import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal(): Record<string, string> {
  const path = join(process.cwd(), ".env.local");
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

function setVar(key: string, value: string): void {
  execSync(`railway variable set ${key} --stdin --skip-deploys`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

const local = loadEnvLocal();
const required = ["ANTHROPIC_API_KEY", "STRIPE_SECRET_KEY"] as const;

for (const key of required) {
  if (!local[key]) {
    throw new Error(`Missing ${key} in .env.local`);
  }
}

setVar("ANTHROPIC_API_KEY", local.ANTHROPIC_API_KEY);
setVar("SESSION_SECRET", randomBytes(32).toString("base64"));
setVar("DATABASE_PATH", "/data/clues.db");
setVar("STRIPE_SECRET_KEY", local.STRIPE_SECRET_KEY);
if (local.STRIPE_PRICE_ID_5) setVar("STRIPE_PRICE_ID_5", local.STRIPE_PRICE_ID_5);
if (local.STRIPE_PRICE_ID_12) setVar("STRIPE_PRICE_ID_12", local.STRIPE_PRICE_ID_12);
if (local.STRIPE_PRICE_ID) setVar("STRIPE_PRICE_ID", local.STRIPE_PRICE_ID);
setVar("STRIPE_CURRENCY", local.STRIPE_CURRENCY ?? "gbp");
setVar("RAILWAY_DEPLOYMENT_DRAINING_SECONDS", "30");
if (local.ADMIN_EMAILS) setVar("ADMIN_EMAILS", local.ADMIN_EMAILS);
if (local.RESEND_API_KEY) setVar("RESEND_API_KEY", local.RESEND_API_KEY);
if (local.EMAIL_FROM) setVar("EMAIL_FROM", local.EMAIL_FROM);
if (local.APP_URL) setVar("APP_URL", local.APP_URL);

console.log("Railway variables configured.");
