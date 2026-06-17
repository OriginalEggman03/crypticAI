import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import {
  findUserByEmail,
  getCreditsStatus,
  isEmailVerified,
  toPublicUser,
} from "@/lib/db/users";

export async function POST(request: NextRequest) {
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
    const message = err instanceof Error ? err.message : "Sign in failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
