import { NextRequest, NextResponse } from "next/server";
import { isLegacyApiDisabled } from "@/lib/legacy-api";
import { anthropicChatJson, parseModelJson } from "@/lib/llm";
import { explainModel } from "@/lib/models";
import { buildExplainPrompt, EXPLAIN_SYSTEM } from "@/lib/prompts";
import type { ClueExplanation } from "@/lib/types";

export async function POST(request: NextRequest) {
  if (isLegacyApiDisabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const body = (await request.json()) as {
      clue: string;
      answer: string;
      clueType?: string | null;
      anagramFodder?: string | null;
    };

    if (!body.clue?.trim() || !body.answer?.trim()) {
      return NextResponse.json(
        { error: "Clue and answer are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No Anthropic API key. Set ANTHROPIC_API_KEY in .env.local." },
        { status: 401 }
      );
    }

    const content = await anthropicChatJson({
      apiKey,
      model: explainModel(),
      system: EXPLAIN_SYSTEM,
      user: buildExplainPrompt(
        body.clue,
        body.answer,
        body.clueType,
        body.anagramFodder
      ),
    });

    const explanation = parseModelJson<ClueExplanation>(content);
    return NextResponse.json({ explanation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Explanation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
