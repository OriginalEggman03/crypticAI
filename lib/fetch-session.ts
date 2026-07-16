import type { AuthMeResponse } from "@/lib/types";

const SESSION_TIMEOUT_MS = 10_000;

/** Load the signed-in user, or null when logged out / unreachable. */
export async function fetchSession(): Promise<AuthMeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", {
      signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AuthMeResponse & { error?: string };
    if (!data.user?.email || !data.credits) return null;
    return { user: data.user, credits: data.credits };
  } catch {
    return null;
  }
}
