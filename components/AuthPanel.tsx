"use client";

import Link from "next/link";
import { useState } from "react";
import type { AuthMeResponse, SignupResponse } from "@/lib/types";

interface AuthPanelProps {
  onSuccess: (session: AuthMeResponse) => void;
}

async function resendVerification(email: string): Promise<string | null> {
  const res = await fetch("/api/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) return data.error || "Could not resend verification email";
  return null;
}

export function AuthPanel({ onSuccess }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function handleResend(targetEmail: string) {
    setResendLoading(true);
    setResendMessage(null);
    setError(null);

    const resendError = await resendVerification(targetEmail);
    setResendLoading(false);
    if (resendError) {
      setResendMessage(resendError);
    } else {
      setResendMessage("Verification email sent — check your inbox.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResendMessage(null);
    setUnverifiedEmail(null);

    if (mode === "signup" && !acceptedTerms) {
      setError("Please accept the Terms and Privacy Policy to create an account.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "signup" ? { acceptedTerms: true } : {}),
        }),
      });

      const data = (await res.json()) as AuthMeResponse &
        SignupResponse & { error?: string; code?: string };

      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED" && data.email) {
          setUnverifiedEmail(data.email);
        }
        throw new Error(data.error || "Authentication failed");
      }

      if (data.needsEmailVerification) {
        setPendingVerificationEmail(data.email);
        setPassword("");
        return;
      }

      onSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  if (pendingVerificationEmail) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-cream/50 p-6 shadow-sm sm:p-8">
        <h2 className="font-display text-xl font-semibold text-ink">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-ink/70">
          We sent a verification link to{" "}
          <span className="font-medium text-ink">{pendingVerificationEmail}</span>.
          Click the link to activate your account, then sign in.
        </p>
        <p className="mt-1 text-sm text-ink/60">
          You get 6 free spins once your email is verified.
        </p>

        {resendMessage && (
          <p
            role="status"
            className={`mt-4 text-sm ${
              resendMessage.includes("sent")
                ? "text-green-800"
                : "text-red-700"
            }`}
          >
            {resendMessage}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={resendLoading}
            onClick={() => handleResend(pendingVerificationEmail)}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent/90 disabled:opacity-60"
          >
            {resendLoading ? "Sending…" : "Resend email"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingVerificationEmail(null);
              setMode("login");
              setResendMessage(null);
            }}
            className="rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-cream/80"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-cream/50 p-6 shadow-sm sm:p-8">
      <h2 className="font-display text-xl font-semibold text-ink">
        {mode === "login" ? "Sign in" : "Create account"}
      </h2>
      {mode === "signup" && (
        <p className="mt-1 text-sm text-ink/60">
          Create an account — we will email you a verification link.
        </p>
      )}

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

        {mode === "signup" && (
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink/75">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink/25 text-accent focus:ring-accent/30"
              required
            />
            <span>
              I agree to the{" "}
              <Link
                href="/terms"
                className="font-medium text-accent underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-medium text-accent underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        {unverifiedEmail && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <p>Did not get the email?</p>
            {resendMessage && (
              <p className="mt-1 text-xs">{resendMessage}</p>
            )}
            <button
              type="button"
              disabled={resendLoading}
              onClick={() => handleResend(unverifiedEmail)}
              className="mt-2 font-medium text-accent underline-offset-2 hover:underline disabled:opacity-60"
            >
              {resendLoading ? "Sending…" : "Resend verification email"}
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (mode === "signup" && !acceptedTerms)}
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
            setUnverifiedEmail(null);
            setResendMessage(null);
            if (mode === "signup") setAcceptedTerms(false);
          }}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          {mode === "login" ? "Create one" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
