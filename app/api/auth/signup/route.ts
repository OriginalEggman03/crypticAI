import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { createVerificationToken } from "@/lib/auth/verification-token";
import { sendVerificationEmail } from "@/lib/auth/verification-email";
import {
  createUser,
  findUserByEmail,
  isEmailVerified,
  refreshUnverifiedSignup,
} from "@/lib/db/users";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-client-ip";
import { captureServerError } from "@/lib/monitoring";

const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit({
    key: `signup:${getClientIp(request)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      acceptedTerms?: boolean;
    };

    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!body.acceptedTerms) {
      return NextResponse.json(
        {
          error:
            "You must accept the Terms of Service and Privacy Policy to sign up.",
        },
        { status: 400 }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (email.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json(
        { error: "Email address is too long." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: "Password is too long." },
        { status: 400 }
      );
    }

    const existing = findUserByEmail(email);
    const { token, hash, expiresAt } = createVerificationToken();
    const passwordHash = hashPassword(password);
    const origin = request.headers.get("origin") ?? undefined;

    if (existing) {
      if (isEmailVerified(existing)) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }

      const updated = refreshUnverifiedSignup(
        existing.id,
        passwordHash,
        hash,
        expiresAt
      );
      if (!updated) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }

      await sendVerificationEmail(updated.email, token, origin);

      return NextResponse.json({
        needsEmailVerification: true,
        email: updated.email,
        verificationResent: true,
      });
    }

    createUser(email, passwordHash, hash, expiresAt);
    await sendVerificationEmail(email, token, origin);

    return NextResponse.json({
      needsEmailVerification: true,
      email: email.toLowerCase(),
    });
  } catch (err) {
    await captureServerError(err, { route: "auth/signup" });
    const message = err instanceof Error ? err.message : "Sign up failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
