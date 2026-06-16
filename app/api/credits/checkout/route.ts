import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { createCreditsCheckoutSession, isStripeConfigured } from "@/lib/stripe";
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Credit purchases are not configured yet. Add STRIPE_SECRET_KEY to .env.local (see .env.example). Optional: STRIPE_PRICE_ID or run npm run setup:stripe.",
      },
      { status: 503 }
    );
  }

  try {
    const origin = request.nextUrl.origin;
    const url = await createCreditsCheckoutSession(
      auth.user.id,
      auth.user.email,
      origin
    );

    return NextResponse.json({ url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
