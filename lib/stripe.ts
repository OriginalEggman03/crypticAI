import Stripe from "stripe";
import {
  CREDIT_PACKS,
  type CreditPack,
  type CreditPackId,
  getCreditPack,
} from "@/lib/credit-packs";

const DEFAULT_CURRENCY = "usd";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

function creditPackCurrency(): string {
  return (process.env.STRIPE_CURRENCY ?? DEFAULT_CURRENCY).trim().toLowerCase();
}

function stripePriceIdForPack(pack: CreditPack): string | undefined {
  if (pack.id === "pack_6") {
    return process.env.STRIPE_PRICE_ID_6?.trim();
  }
  return (
    process.env.STRIPE_PRICE_ID_12?.trim() ||
    process.env.STRIPE_PRICE_ID?.trim()
  );
}

function checkoutLineItem(
  pack: CreditPack
): Stripe.Checkout.SessionCreateParams.LineItem {
  const priceId = stripePriceIdForPack(pack);
  if (priceId) {
    return { price: priceId, quantity: 1 };
  }

  return {
    quantity: 1,
    price_data: {
      currency: creditPackCurrency(),
      unit_amount: pack.cents,
      product_data: {
        name: `CrypticAI — ${pack.credits} clue credits`,
        description: `${pack.credits} anagram clue generations`,
      },
    },
  };
}

export async function createCreditsCheckoutSession(
  userId: number,
  email: string,
  origin: string,
  packId: CreditPackId
): Promise<string> {
  const pack = getCreditPack(packId);
  if (!pack) throw new Error("Invalid credit pack");

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [checkoutLineItem(pack)],
    success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    metadata: {
      userId: String(userId),
      credits: String(pack.credits),
      packId: pack.id,
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Create reusable Prices in Stripe (run once via scripts/setup-stripe.ts). */
export async function createCreditPackPrices(): Promise<
  Record<CreditPackId, { productId: string; priceId: string }>
> {
  const stripe = getStripe();
  const results = {} as Record<
    CreditPackId,
    { productId: string; priceId: string }
  >;

  for (const pack of Object.values(CREDIT_PACKS)) {
    const product = await stripe.products.create({
      name: `CrypticAI — ${pack.credits} clue credits`,
      description: `${pack.credits} anagram clue generations`,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.cents,
      currency: creditPackCurrency(),
    });

    results[pack.id] = { productId: product.id, priceId: price.id };
  }

  return results;
}
