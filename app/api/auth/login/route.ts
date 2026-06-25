import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import {
  findUserByEmail,
  getCreditsStatus,
  isEmailVerified,
  toPublicUser,
} from "@/lib/db/users";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-client-ip";
import { captureServerError } from "@/lib/monitoring";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit({
    key: `login:${getClientIp(request)}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!isEmailVerified(user)) {
      return NextResponse.json(
        {
          error:
            "Verify your email before signing in. Check your inbox or resend the link.",
          code: "EMAIL_NOT_VERIFIED",
          email: user.email,
        },
        { status: 403 }
      );
    }

    const token = createSessionToken(user.id);
    const response = NextResponse.json({
      user: toPublicUser(user),
      credits: getCreditsStatus(user),
    });

    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (err) {
    await captureServerError(err, { route: "auth/login" });
    const message = err instanceof Error ? err.message : "Sign in failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
