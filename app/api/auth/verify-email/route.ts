import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { createVerificationToken } from "@/lib/auth/verification-token";
import { sendVerificationEmail } from "@/lib/auth/verification-email";
import {
  findUserByEmail,
  isEmailVerified,
  setEmailVerificationToken,
  verifyEmailWithToken,
} from "@/lib/db/users";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-client-ip";

function redirectUrl(request: NextRequest, query: string): URL {
  const origin =
    request.headers.get("origin") ||
    process.env.APP_URL?.trim() ||
    request.nextUrl.origin;
  return new URL(`/?${query}`, origin);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(redirectUrl(request, "verify=invalid"));
  }

  const user = verifyEmailWithToken(token);
  if (!user) {
    return NextResponse.redirect(redirectUrl(request, "verify=invalid"));
  }

  const sessionToken = createSessionToken(user.id);
  const response = NextResponse.redirect(redirectUrl(request, "verified=1"));
  response.cookies.set(sessionCookieOptions(sessionToken));
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() ?? "";

    const limited = enforceRateLimit({
      key: `verify-resend:${getClientIp(request)}:${email.toLowerCase()}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (limited) return limited;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const user = findUserByEmail(email);
    if (!user || isEmailVerified(user)) {
      return NextResponse.json({ ok: true });
    }

    const { token, hash, expiresAt } = createVerificationToken();
    setEmailVerificationToken(user.id, hash, expiresAt);

    const origin = request.headers.get("origin") ?? undefined;
    await sendVerificationEmail(user.email, token, origin);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not resend verification email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
