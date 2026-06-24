/**
 * Switch production Stripe from test to live mode.
 *
 * Prerequisites:
 *   1. Stripe account activated for live payments (dashboard.stripe.com)
 *   2. Toggle Test mode OFF → Developers → API keys → copy Secret key (sk_live_...)
 *   3. Add to .env.local: STRIPE_SECRET_KEY=sk_live_...
 *   4. Optional: STRIPE_CURRENCY=gbp (default gbp for crypticai.uk)
 *
 * Usage:
 *   npm run setup:stripe:production
 */
import { execSync } from "node:child_process";
import Stripe from "stripe";
import { loadEnvLocal } from "../lib/load-env-local";
import { createCreditPackPrices, isStripeLiveKey } from "../lib/stripe";

const PRODUCTION_WEBHOOK_URL = "https://www.crypticai.uk/api/webhooks/stripe";

function setRailwayVar(key: string, value: string): void {
  execSync(`railway variable set ${key} --stdin --skip-deploys`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
  console.log(`Railway: ${key} updated`);
}

async function configureWebhook(stripe: Stripe): Promise<string> {
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  for (const endpoint of existing.data.filter((item) => item.url === PRODUCTION_WEBHOOK_URL)) {
    await stripe.webhookEndpoints.del(endpoint.id);
    console.log("Removed existing webhook:", endpoint.id);
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: PRODUCTION_WEBHOOK_URL,
    enabled_events: ["checkout.session.completed"],
    description: "CrypticAI credit purchases (live)",
  });

  if (!endpoint.secret) {
    throw new Error("Stripe did not return a webhook signing secret");
  }

  return endpoint.secret;
}

async function main() {
  loadEnvLocal();

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.error(`
Missing STRIPE_SECRET_KEY in .env.local.

1. Open https://dashboard.stripe.com/apikeys (Test mode OFF)
2. Copy the Secret key (sk_live_...)
3. Add to .env.local:
   STRIPE_SECRET_KEY=sk_live_...
4. Run: npm run setup:stripe:production
`);
    process.exit(1);
  }

  if (!isStripeLiveKey(key)) {
    console.error(`
STRIPE_SECRET_KEY is still a test key (sk_test_...).

To go live:
1. Open https://dashboard.stripe.com/apikeys
2. Turn Test mode OFF (toggle top-right)
3. Copy the live Secret key (sk_live_...) — not a restricted key (rk_live_)
4. Replace STRIPE_SECRET_KEY in .env.local
5. Run this script again
`);
    process.exit(1);
  }

  const currency = (process.env.STRIPE_CURRENCY ?? "gbp").trim().toLowerCase();
  process.env.STRIPE_CURRENCY = currency;

  console.log(`Creating live Stripe products/prices (${currency})...`);
  const prices = await createCreditPackPrices();

  console.log(`
Live prices created:
  5 credits:  ${prices.pack_5.priceId}
  12 credits: ${prices.pack_12.priceId}
`);

  console.log("Updating Railway variables...");
  setRailwayVar("STRIPE_SECRET_KEY", key);
  setRailwayVar("STRIPE_CURRENCY", currency);
  setRailwayVar("STRIPE_PRICE_ID_5", prices.pack_5.priceId);
  setRailwayVar("STRIPE_PRICE_ID_12", prices.pack_12.priceId);
  setRailwayVar("STRIPE_PRICE_ID", prices.pack_12.priceId);

  const stripe = new Stripe(key);
  console.log(`Registering live webhook at ${PRODUCTION_WEBHOOK_URL}...`);
  const webhookSecret = await configureWebhook(stripe);
  setRailwayVar("STRIPE_WEBHOOK_SECRET", webhookSecret);

  console.log("\nRedeploying production...");
  execSync("railway service crypticAI && railway redeploy --from-source --yes", {
    stdio: "inherit",
  });

  console.log(`
Stripe live mode configured on Railway.

Verify:
  1. https://www.crypticai.uk — sign in and buy credits (use a real card)
  2. Stripe Dashboard → Payments (Live mode) shows the charge
  3. Webhook deliveries succeed for checkout.session.completed
`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
