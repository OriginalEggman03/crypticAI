import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import {
  createUser,
  findUserByEmail,
  getCreditsStatus,
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

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (findUserByEmail(email)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const user = createUser(email, hashPassword(password));
    const token = createSessionToken(user.id);
    const response = NextResponse.json({
      user: toPublicUser(user),
      credits: getCreditsStatus(user),
    });

    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign up failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
