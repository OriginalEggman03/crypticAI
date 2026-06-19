import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/require-user";
import { clearSessionCookieOptions } from "@/lib/auth/session";
import { deleteUserById } from "@/lib/db/users";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password ?? "";

    if (!password) {
      return NextResponse.json(
        { error: "Enter your password to delete your account." },
        { status: 400 }
      );
    }

    if (!verifyPassword(password, auth.user.passwordHash)) {
      return NextResponse.json(
        { error: "Incorrect password." },
        { status: 401 }
      );
    }

    if (!deleteUserById(auth.user.id)) {
      return NextResponse.json(
        { error: "Could not delete account." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(clearSessionCookieOptions());
    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not delete account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
