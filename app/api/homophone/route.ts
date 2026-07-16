import { NextRequest, NextResponse } from "next/server";
import { generateVerifiedHomophoneClue } from "@/lib/homophone-pipeline";
import { redactAnagramResultForViewer } from "@/lib/redact-anagram-result";
import { requireVerifiedUser } from "@/lib/auth/require-user";
import { isAdminUser } from "@/lib/admin";
import {
  consumeGenerationCredit,
  getCreditsStatus,
} from "@/lib/db/users";
import { enforceRateLimit } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/monitoring";
import type { HomophoneRequest } from "@/lib/types";

export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if ("response" in auth) return auth.response;

    if (!isAdminUser(auth.user)) {
      const limited = enforceRateLimit({
        key: `homophone:user:${auth.user.id}`,
        limit: 30,
        windowMs: 60 * 60 * 1000,
      });
      if (limited) return limited;
    }

    const creditsBefore = getCreditsStatus(auth.user);
    if (!creditsBefore.canGenerate) {
      return NextResponse.json(
        {
          error: "No credits remaining. Add credits to generate more clues.",
          credits: creditsBefore,
        },
        { status: 402 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No Anthropic API key. Set ANTHROPIC_API_KEY in .env.local." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { request: HomophoneRequest };
    const req: HomophoneRequest = {
      exclude: body.request?.exclude,
    };

    const outcome = await generateVerifiedHomophoneClue(apiKey, req);

    if ("error" in outcome) {
      console.error(
        "[homophone] 422",
        JSON.stringify({
          excludeCount: req.exclude?.length ?? 0,
          error: outcome.error,
          debug: outcome.debug,
          llmCalls: outcome.llmCalls,
        })
      );
      return NextResponse.json({ error: outcome.error }, { status: 422 });
    }

    const credits =
      outcome.llmCalls > 0
        ? consumeGenerationCredit(auth.user.id)
        : creditsBefore;

    return NextResponse.json({
      result: redactAnagramResultForViewer(outcome, auth.user),
      credits,
    });
  } catch (err) {
    await captureServerError(err, { route: "homophone" });
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
