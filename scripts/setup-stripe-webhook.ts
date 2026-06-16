import Stripe from "stripe";
import { execSync } from "node:child_process";
import { loadEnvLocal } from "../lib/load-env-local";

loadEnvLocal();

const url = process.argv[2];
if (!url) {
  console.error("Usage: npx tsx scripts/setup-stripe-webhook.ts <webhook-url>");
  process.exit(1);
}

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set in .env.local");
  process.exit(1);
}

const stripe = new Stripe(key);

async function main() {
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  for (const endpoint of existing.data.filter((item) => item.url === url)) {
    await stripe.webhookEndpoints.del(endpoint.id);
    console.log("Removed existing webhook:", endpoint.id);
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url,
    enabled_events: ["checkout.session.completed"],
    description: "CrypticAI credit purchases",
  });

  if (!endpoint.secret) {
    throw new Error("Stripe did not return a webhook signing secret");
  }

  execSync("railway variable set STRIPE_WEBHOOK_SECRET --stdin --skip-deploys", {
    input: endpoint.secret,
    stdio: ["pipe", "inherit", "inherit"],
  });

  console.log("Created webhook:", endpoint.id);
  console.log("STRIPE_WEBHOOK_SECRET configured on Railway");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
