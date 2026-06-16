"use client";

import { useState } from "react";
import type { AuthMeResponse } from "@/lib/types";

interface AuthPanelProps {
  onSuccess: (session: AuthMeResponse) => void;
}

export function AuthPanel({ onSuccess }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as AuthMeResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-cream/50 p-6 shadow-sm sm:p-8">
      <h2 className="font-display text-xl font-semibold text-ink">
        {mode === "login" ? "Sign in" : "Create account"}
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        Sign in to generate clues.
      </p>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink/80">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink/80">
            Password
          </span>
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-paper shadow-md transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? mode === "login"
              ? "Signing in…"
              : "Creating account…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink/60">
        {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          {mode === "login" ? "Create one" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
