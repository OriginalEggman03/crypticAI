import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedUser } from "@/lib/auth/require-user";
import { getCreditPack } from "@/lib/credit-packs";
import { publicOriginFromRequest } from "@/lib/request-origin";
import { createCreditsCheckoutSession, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const auth = await requireVerifiedUser();
  if ("response" in auth) return auth.response;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Credit purchases are not configured yet. Add STRIPE_SECRET_KEY to .env.local (see .env.example). Optional: STRIPE_PRICE_ID_6 / STRIPE_PRICE_ID_12 or run npm run setup:stripe.",
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      packId?: string;
    };
    const packId = body.packId?.trim() ?? "pack_12";
    if (!getCreditPack(packId)) {
      return NextResponse.json(
        { error: "Invalid credit pack." },
        { status: 400 }
      );
    }

    const origin = publicOriginFromRequest(request);
    const url = await createCreditsCheckoutSession(
      auth.user.id,
      auth.user.email,
      origin,
      packId as "pack_6" | "pack_12"
    );

    return NextResponse.json({ url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
