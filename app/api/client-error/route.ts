import { NextRequest, NextResponse } from "next/server";
import { captureServerError } from "@/lib/monitoring";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-client-ip";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit({
    key: `client-error:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as {
      message?: string;
      digest?: string;
    };

    await captureServerError(new Error(body.message ?? "Client error"), {
      digest: body.digest,
      source: "client",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
