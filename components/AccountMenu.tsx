"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BuyCreditsButtons } from "@/components/BuyCreditsButtons";
import type { CreditPackId } from "@/lib/credit-packs";
import { formatCreditsSummary } from "@/lib/credits-display";
import type { AuthMeResponse } from "@/lib/types";

interface AccountMenuProps {
  session: AuthMeResponse;
  onLogout: () => void;
  onAccountDeleted: () => void;
  onBuyCredits: (packId: CreditPackId) => void;
  checkoutPackId?: CreditPackId | null;
}

export function AccountMenu({
  session,
  onLogout,
  onAccountDeleted,
  onBuyCredits,
  checkoutPackId,
}: AccountMenuProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setConfirmDelete(false);
    setPassword("");
    setDeleteError(null);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const { user, credits } = session;
  const creditsSummary = formatCreditsSummary(credits);
  const canGenerate = credits.canGenerate;

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    close();
    onLogout();
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete account");
      close();
      onAccountDeleted();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete account"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setConfirmDelete(false);
          setDeleteError(null);
          setPassword("");
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Account menu for ${user.email}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 bg-white/80 text-ink shadow-sm transition hover:bg-cream/80"
      >
        <UserIcon />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-ink/10 bg-paper py-3 shadow-lg"
        >
          <div className="border-b border-ink/10 px-4 pb-3">
            <p className="truncate text-sm font-medium text-ink">{user.email}</p>
            <p className="mt-1 text-xs text-ink/55">{creditsSummary}</p>
          </div>

          {!confirmDelete ? (
            <>
              <div className="px-4 py-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/45">
                  Buy credits
                </p>
                <BuyCreditsButtons
                  onBuy={(packId) => {
                    onBuyCredits(packId);
                    close();
                  }}
                  loadingPackId={checkoutPackId}
                  emphasis={canGenerate ? "optional" : "need-credits"}
                />
              </div>

              <div className="border-t border-ink/10 py-1">
                <button
                  type="button"
                  role="menuitem"
                  disabled={loggingOut}
                  onClick={handleLogout}
                  className="flex w-full px-4 py-2.5 text-left text-sm text-ink/85 transition hover:bg-cream/80 disabled:opacity-60"
                >
                  {loggingOut ? "Signing out…" : "Sign out"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setConfirmDelete(true);
                    setDeleteError(null);
                    setPassword("");
                  }}
                  className="flex w-full px-4 py-2.5 text-left text-sm text-red-700 transition hover:bg-red-50"
                >
                  Delete account
                </button>
              </div>
            </>
          ) : (
            <form
              className="px-4 py-3"
              onSubmit={handleDeleteAccount}
            >
              <p className="text-sm font-medium text-ink">
                Delete your account?
              </p>
              <p className="mt-1 text-xs text-ink/55">
                This permanently removes your account and credits. Enter your
                password to confirm.
              </p>
              <label className="mt-3 block">
                <span className="sr-only">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="Password"
                />
              </label>
              {deleteError && (
                <p role="alert" className="mt-2 text-xs text-red-700">
                  {deleteError}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={deleting}
                  className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-paper transition hover:bg-red-800 disabled:opacity-60"
                >
                  {deleting ? "Deleting…" : "Delete account"}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeleteError(null);
                    setPassword("");
                  }}
                  className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-medium text-ink/70 transition hover:bg-cream/80"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25 8.25 0 1 1 16.5 0"
      />
    </svg>
  );
}
