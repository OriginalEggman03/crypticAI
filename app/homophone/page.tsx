"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { AnagramResult } from "@/components/AnagramResult";
import { AuthPanel } from "@/components/AuthPanel";
import { ClueArchiveSearch } from "@/components/ClueArchiveSearch";
import { ClueBuilderNav } from "@/components/ClueBuilderNav";
import { HomophoneForm } from "@/components/HomophoneForm";
import { toUsedClue } from "@/lib/clue-history";
import { fetchSession } from "@/lib/fetch-session";
import { HOMOPHONE_TAGLINE } from "@/lib/site-config";
import type { CreditPackId } from "@/lib/credit-packs";
import type {
  AnagramApiResponse,
  AnagramClueResult,
  AuthMeResponse,
  CreditsStatus,
  HomophoneRequest,
  UsedAnagramClue,
} from "@/lib/types";

type HomophoneTab = "create" | "archive";

async function fetchHomophone(
  request: HomophoneRequest
): Promise<{ result: AnagramClueResult; credits: CreditsStatus }> {
  const res = await fetch("/api/homophone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request }),
    signal: AbortSignal.timeout(180_000),
  });

  let data: AnagramApiResponse;
  try {
    data = await res.json();
  } catch {
    throw new Error(
      "Server returned an invalid response. Is npm run dev still running?"
    );
  }

  if (!res.ok) {
    throw new Error(data.error || "Generation failed");
  }

  if (!data.result?.verified || !data.credits) {
    throw new Error("No verified clue was produced.");
  }

  return { result: data.result, credits: data.credits };
}

function formatFetchError(err: unknown): string {
  let message = err instanceof Error ? err.message : "Something went wrong";
  if (err instanceof TypeError && /fetch|network/i.test(message)) {
    message =
      "Cannot reach the server. Run npm run dev and open the exact URL shown in the terminal (often http://localhost:3000, or 3001 if 3000 is busy).";
  } else if (err instanceof DOMException && err.name === "TimeoutError") {
    message = "Request timed out after 3 minutes. Try again.";
  }
  return message;
}

export default function HomophonePage() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<HomophoneTab>("create");
  const [session, setSession] = useState<AuthMeResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [result, setResult] = useState<AnagramClueResult | null>(null);
  const [usedClues, setUsedClues] = useState<UsedAnagramClue[]>([]);
  const [checkoutPackId, setCheckoutPackId] = useState<CreditPackId | null>(null);

  const refreshSession = useCallback(async () => {
    const next = await fetchSession();
    setSession(next);
    return next;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    void (async () => {
      try {
        await refreshSession();
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, refreshSession]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;

    const sessionId = params.get("session_id");
    window.history.replaceState({}, "", window.location.pathname);

    if (sessionId) {
      fetch("/api/credits/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data: AuthMeResponse & { error?: string }) => {
          if (data.user && data.credits) {
            setSession({ user: data.user, credits: data.credits });
          } else {
            refreshSession();
          }
        })
        .catch(() => refreshSession());
    } else {
      refreshSession();
    }
  }, [refreshSession]);

  const buyCredits = useCallback(async (packId: CreditPackId) => {
    setCheckoutPackId(packId);
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (!data.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start checkout"
      );
      setCheckoutPackId(null);
    }
  }, []);

  const updateCredits = useCallback((credits: CreditsStatus) => {
    setSession((prev) => (prev ? { ...prev, credits } : prev));
  }, []);

  const generate = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);
    setRetryError(null);

    try {
      const { result: next, credits } = await fetchHomophone({
        exclude: usedClues,
      });
      setResult(next);
      setUsedClues((prev) => [...prev, toUsedClue(next.clue)]);
      updateCredits(credits);
    } catch (err) {
      setError(formatFetchError(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [session, usedClues, updateCredits]);

  const retry = useCallback(async () => {
    if (!result || !session) return;

    setRetryLoading(true);
    setRetryError(null);

    try {
      const { result: next, credits } = await fetchHomophone({
        exclude: usedClues,
      });
      setResult(next);
      setUsedClues((prev) => [...prev, toUsedClue(next.clue)]);
      updateCredits(credits);
    } catch (err) {
      setRetryError(formatFetchError(err));
    } finally {
      setRetryLoading(false);
    }
  }, [result, session, usedClues, updateCredits]);

  const reset = () => {
    setResult(null);
    setError(null);
    setRetryError(null);
    setUsedClues([]);
  };

  const canGenerate = Boolean(
    session?.credits?.adminUnlimited || session?.credits?.canGenerate
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    setResult(null);
    setError(null);
    setRetryError(null);
  }, []);

  const handleAccountDeleted = useCallback(() => {
    setSession(null);
    setResult(null);
    setError(null);
    setRetryError(null);
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="mb-10">
        <div className="mb-6 flex min-h-10 items-center justify-between gap-2">
          <div className="shrink-0">
            {tab === "create" ? (
              <button
                type="button"
                id="tab-archive"
                onClick={() => setTab("archive")}
                className="rounded-lg border border-ink/15 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-ink shadow-sm transition hover:bg-cream/80 sm:px-3 sm:py-2 sm:text-sm"
              >
                Archives
              </button>
            ) : (
              <button
                type="button"
                id="tab-create"
                onClick={() => setTab("create")}
                className="rounded-lg border border-ink/15 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-ink shadow-sm transition hover:bg-cream/80 sm:px-3 sm:py-2 sm:text-sm"
              >
                Generator
              </button>
            )}
          </div>
          {session && (
            <div className="shrink-0">
              <AccountMenu
                session={session}
                onLogout={handleLogout}
                onAccountDeleted={handleAccountDeleted}
                onBuyCredits={buyCredits}
                checkoutPackId={checkoutPackId}
              />
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="mb-2 font-display text-sm uppercase tracking-[0.2em] text-accent">
            Cryptic AI
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {HOMOPHONE_TAGLINE}
          </h1>
          <div className="mt-4">
            <ClueBuilderNav />
          </div>
        </div>
      </header>

      <div
        role="tabpanel"
        id="panel-create"
        aria-labelledby="tab-create"
        hidden={tab !== "create"}
      >
        {!mounted ? null : sessionLoading ? (
          <p className="text-center text-sm text-ink/60">Loading…</p>
        ) : !session ? (
          <AuthPanel
            onSuccess={(next) => {
              setSession(next);
              setError(null);
            }}
          />
        ) : !result ? (
          <div>
            <div className="rounded-2xl border border-ink/10 bg-cream/50 p-6 shadow-sm sm:p-8">
              <HomophoneForm
                onSubmit={generate}
                loading={loading || checkoutPackId != null}
                canGenerate={canGenerate}
                onBuyCredits={buyCredits}
                checkoutPackId={checkoutPackId}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
          </div>
        ) : (
          <AnagramResult
            variant="homophone"
            result={result}
            inspiration=""
            error={retryError}
            onNew={reset}
            onRetry={retry}
            retryLoading={retryLoading}
            canGenerate={canGenerate}
            onBuyCredits={buyCredits}
            checkoutPackId={checkoutPackId}
          />
        )}
      </div>

      <div
        role="tabpanel"
        id="panel-archive"
        aria-labelledby="tab-archive"
        hidden={tab !== "archive"}
      >
        <ClueArchiveSearch
          variant="homophone"
          isLoggedIn={Boolean(session)}
          authReady={mounted && !sessionLoading}
          onSignUp={() => setTab("create")}
        />
      </div>
    </main>
  );
}
