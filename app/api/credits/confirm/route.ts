import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedUser } from "@/lib/auth/require-user";
import { fulfillCheckoutSessionById } from "@/lib/stripe-fulfillment";
import { toPublicUser } from "@/lib/db/users";

export async function POST(request: NextRequest) {
  const auth = await requireVerifiedUser();
  if ("response" in auth) return auth.response;

  const body = (await request.json()) as { sessionId?: string };
  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const result = await fulfillCheckoutSessionById(sessionId, auth.user.id);
    if (!result) {
      return NextResponse.json(
        { error: "Payment not completed or session invalid." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      user: toPublicUser(result.user),
      credits: result.credits,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not confirm payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
