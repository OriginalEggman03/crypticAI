"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm text-ink/70">
        An unexpected error occurred. You can try again or return home.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-ink/20 bg-white/50 px-5 py-2.5 text-sm font-medium text-ink hover:bg-white"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
