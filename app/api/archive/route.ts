import { NextRequest, NextResponse } from "next/server";
import {
  archiveClue,
  searchArchivedClues,
  validateRating,
} from "@/lib/db/clue-archive";
import { invalidateIndicatorUsageCache } from "@/lib/indicator-archive-weights";
import { requireVerifiedUser } from "@/lib/auth/require-user";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { AnagramDifficulty } from "@/lib/types";

const MAX_ARCHIVE_TEXT = 2000;

function parseDifficulty(value: string | null): AnagramDifficulty | undefined {
  if (value === "easy" || value === "hard") return value;
  return undefined;
}

function parseRatingParam(value: string | null): number | undefined {
  if (!value?.trim()) return undefined;
  const n = parseInt(value, 10);
  return validateRating(n) ? n : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const inspiration = searchParams.get("inspiration") ?? undefined;
    const difficulty = parseDifficulty(searchParams.get("difficulty"));
    const rating = parseRatingParam(searchParams.get("rating"));
    const minRating = parseRatingParam(searchParams.get("minRating"));
    const maxRating = parseRatingParam(searchParams.get("maxRating"));
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

    const results = searchArchivedClues({
      inspiration,
      difficulty,
      rating,
      minRating,
      maxRating,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if ("response" in auth) return auth.response;

    const limited = enforceRateLimit({
      key: `archive:user:${auth.user.id}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (limited) return limited;

    const body = (await request.json()) as {
      inspiration?: string;
      difficulty?: string;
      answer?: string;
      clue?: string;
      anagramFodder?: string;
      anagramIndicator?: string;
      rating?: number;
    };

    if (!validateRating(body.rating)) {
      return NextResponse.json(
        { error: "A star rating from 1 to 5 is required to archive a clue." },
        { status: 400 }
      );
    }

    const difficulty = body.difficulty === "hard" ? "hard" : "easy";

    const inspiration = (body.inspiration ?? "").slice(0, MAX_ARCHIVE_TEXT);
    const answer = (body.answer ?? "").slice(0, 200);
    const clue = (body.clue ?? "").slice(0, MAX_ARCHIVE_TEXT);
    const anagramFodder = (body.anagramFodder ?? "").slice(0, 200);

    const archived = archiveClue({
      inspiration,
      difficulty,
      answer,
      clue,
      anagramFodder,
      anagramIndicator: body.anagramIndicator?.slice(0, 200),
      rating: body.rating,
    });

    invalidateIndicatorUsageCache();

    return NextResponse.json({ archived });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Archive failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
