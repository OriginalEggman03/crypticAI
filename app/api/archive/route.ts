import { NextRequest, NextResponse } from "next/server";
import {
  archiveClue,
  searchArchivedClues,
  validateRating,
} from "@/lib/db/clue-archive";
import { invalidateIndicatorUsageCache } from "@/lib/indicator-archive-weights";
import type { AnagramDifficulty } from "@/lib/types";

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

    const archived = archiveClue({
      inspiration: body.inspiration ?? "",
      difficulty,
      answer: body.answer ?? "",
      clue: body.clue ?? "",
      anagramFodder: body.anagramFodder ?? "",
      anagramIndicator: body.anagramIndicator,
      rating: body.rating,
    });

    invalidateIndicatorUsageCache();

    return NextResponse.json({ archived });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Archive failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
