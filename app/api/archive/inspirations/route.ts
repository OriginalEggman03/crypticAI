import { NextRequest, NextResponse } from "next/server";
import {
  listInspirationPrefixMatches,
  listRecentInspirations,
} from "@/lib/db/clue-archive";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (q) {
      return NextResponse.json({
        suggestions: listInspirationPrefixMatches(q, 10),
      });
    }

    const recent = listRecentInspirations(3);
    return NextResponse.json({ recent, suggestions: recent });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load inspirations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
