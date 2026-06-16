import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  findUserById,
  getCreditsStatus,
  toPublicUser,
} from "@/lib/db/users";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  return NextResponse.json({
    user: toPublicUser(user),
    credits: getCreditsStatus(user),
  });
}
