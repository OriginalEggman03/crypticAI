"use client";

import { useState } from "react";
import { CREDITS_PER_PURCHASE } from "@/lib/auth/constants";
import type { AuthMeResponse } from "@/lib/types";

interface CreditsBarProps {
  session: AuthMeResponse;
  onLogout: () => void;
}

export function CreditsBar({ session, onLogout }: CreditsBarProps) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { user, credits } = session;
  const freeRemaining = credits?.freeRemaining ?? 0;
  const paidCredits = credits?.paidCredits ?? 0;
  const canGenerate = credits?.canGenerate ?? false;

  async function buyCredits() {
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/credits/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (!data.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Could not start checkout"
      );
      setCheckoutLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  return (
    <div className="mb-8 rounded-xl border border-ink/10 bg-white/50 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-ink/80">{user.email}</p>
          <p className="mt-0.5 text-xs text-ink/55">
            {freeRemaining > 0 ? (
              <>
                <span className="font-mono text-ink/70">
                  {freeRemaining}
                </span>{" "}
                free {freeRemaining === 1 ? "spin" : "spins"} left
                {paidCredits > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-mono text-ink/70">
                      {paidCredits}
                    </span>{" "}
                    paid credits
                  </>
                )}
              </>
            ) : paidCredits > 0 ? (
              <>
                <span className="font-mono text-ink/70">
                  {paidCredits}
                </span>{" "}
                paid {paidCredits === 1 ? "credit" : "credits"}
              </>
            ) : (
              <>No free spins left — add credits to generate more</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!canGenerate && (
            <button
              type="button"
              onClick={buyCredits}
              disabled={checkoutLoading}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-accent/90 disabled:opacity-60"
            >
              {checkoutLoading
                ? "Redirecting…"
                : `Add ${CREDITS_PER_PURCHASE} credits`}
            </button>
          )}
          {canGenerate && freeRemaining === 0 && (
            <button
              type="button"
              onClick={buyCredits}
              disabled={checkoutLoading}
              className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/75 transition hover:bg-cream/80 disabled:opacity-60"
            >
              {checkoutLoading ? "Redirecting…" : "Buy more"}
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/60 transition hover:bg-cream/80"
          >
            Sign out
          </button>
        </div>
      </div>

      {checkoutError && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {checkoutError}
        </p>
      )}
    </div>
  );
}
