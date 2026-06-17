import { NextResponse } from "next/server";
import { findUserById, isEmailVerified } from "@/lib/db/users";
import { getSessionUserId } from "./session";
import type { UserRecord } from "@/lib/db/users";

export async function requireUser(): Promise<
  { user: UserRecord } | { response: NextResponse }
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      response: NextResponse.json(
        { error: "Sign in to generate clues." },
        { status: 401 }
      ),
    };
  }

  const user = findUserById(userId);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 }
      ),
    };
  }

  return { user };
}

export async function requireVerifiedUser(): Promise<
  { user: UserRecord } | { response: NextResponse }
> {
  const auth = await requireUser();
  if ("response" in auth) return auth;

  if (!isEmailVerified(auth.user)) {
    return {
      response: NextResponse.json(
        {
          error: "Verify your email before generating clues.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      ),
    };
  }

  return auth;
}
