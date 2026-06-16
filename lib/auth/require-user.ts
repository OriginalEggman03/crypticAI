import { NextResponse } from "next/server";
import { findUserById } from "@/lib/db/users";
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
