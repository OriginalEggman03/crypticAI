/**
 * Create a Stripe product + price and print env lines for .env.local
 *
 * Usage:
 *   1. Add STRIPE_SECRET_KEY=sk_test_... to .env.local (Stripe Dashboard → Developers → API keys)
 *   2. npm run setup:stripe
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvLocal } from "../lib/load-env-local";
import { createCreditPackPrice } from "../lib/stripe";

function upsertEnvLocal(key: string, value: string) {
  const path = join(process.cwd(), ".env.local");
  const lines = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
  const prefix = `${key}=`;
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  writeFileSync(path, next.join("\n").replace(/\n?$/, "\n"), "utf8");
}

async function main() {
  loadEnvLocal();

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    console.error(`
Missing STRIPE_SECRET_KEY.

1. Open https://dashboard.stripe.com/test/apikeys
2. Copy the Secret key (sk_test_...)
3. Add to .env.local:
   STRIPE_SECRET_KEY=sk_test_...
4. Run: npm run setup:stripe
`);
    process.exit(1);
  }

  const { productId, priceId } = await createCreditPackPrice();

  upsertEnvLocal("STRIPE_PRICE_ID", priceId);

  console.log(`
Stripe credit pack created.

Product:  ${productId}
Price:    ${priceId}

Wrote STRIPE_PRICE_ID to .env.local.

Restart npm run dev, then test checkout with card 4242 4242 4242 4242.

Local webhook (optional — success redirect also grants credits):
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  → add STRIPE_WEBHOOK_SECRET=whsec_... to .env.local
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
