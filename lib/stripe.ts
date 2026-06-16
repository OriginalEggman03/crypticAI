import Stripe from "stripe";
import { CREDITS_PER_PURCHASE } from "@/lib/auth/constants";

const DEFAULT_PACK_CENTS = 500;
const DEFAULT_CURRENCY = "gbp";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

function creditPackCents(): number {
  const raw = process.env.STRIPE_CREDIT_PACK_CENTS;
  if (!raw) return DEFAULT_PACK_CENTS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PACK_CENTS;
}

function creditPackCurrency(): string {
  return (process.env.STRIPE_CURRENCY ?? DEFAULT_CURRENCY).trim().toLowerCase();
}

function checkoutLineItem(): Stripe.Checkout.SessionCreateParams.LineItem {
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  if (priceId) {
    return { price: priceId, quantity: 1 };
  }

  return {
    quantity: 1,
    price_data: {
      currency: creditPackCurrency(),
      unit_amount: creditPackCents(),
      product_data: {
        name: `CrypticAI — ${CREDITS_PER_PURCHASE} clue credits`,
        description: `${CREDITS_PER_PURCHASE} anagram clue generations`,
      },
    },
  };
}

export async function createCreditsCheckoutSession(
  userId: number,
  email: string,
  origin: string
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [checkoutLineItem()],
    success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    metadata: {
      userId: String(userId),
      credits: String(CREDITS_PER_PURCHASE),
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Create a reusable Price in Stripe (run once via scripts/setup-stripe.ts). */
export async function createCreditPackPrice(): Promise<{
  productId: string;
  priceId: string;
}> {
  const stripe = getStripe();
  const product = await stripe.products.create({
    name: `CrypticAI — ${CREDITS_PER_PURCHASE} clue credits`,
    description: `${CREDITS_PER_PURCHASE} anagram clue generations`,
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: creditPackCents(),
    currency: creditPackCurrency(),
  });

  return { productId: product.id, priceId: price.id };
}
