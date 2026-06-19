import type { NextRequest } from "next/server";

const DEFAULT_SITE_URL = "https://www.crypticai.uk";

/** Public site origin for redirects and Stripe return URLs (not the internal bind address). */
export function publicOriginFromRequest(request: NextRequest): string {
  const configured =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  }

  const origin = request.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");

  const host = request.headers.get("host")?.trim();
  if (host && !host.startsWith("0.0.0.0")) {
    const proto = request.nextUrl.protocol.replace(":", "");
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return request.nextUrl.origin.replace(/\/$/, "") || DEFAULT_SITE_URL;
}
