import type { CreditsStatus } from "@/lib/types";

export function formatCreditsSummary(credits: CreditsStatus): string {
  const freeRemaining = credits.freeRemaining;
  const paidCredits = credits.paidCredits;

  if (freeRemaining > 0 && paidCredits > 0) {
    return `${freeRemaining} free ${freeRemaining === 1 ? "spin" : "spins"} · ${paidCredits} paid ${paidCredits === 1 ? "credit" : "credits"}`;
  }
  if (freeRemaining > 0) {
    return `${freeRemaining} free ${freeRemaining === 1 ? "spin" : "spins"} left`;
  }
  if (paidCredits > 0) {
    return `${paidCredits} paid ${paidCredits === 1 ? "credit" : "credits"}`;
  }
  return "No credits remaining";
}

function creditCountClassName(value: number): string {
  return value > 0
    ? "font-display text-lg font-bold tabular-nums text-accent"
    : "font-display text-lg font-bold tabular-nums text-ink/35";
}

/** Paid balance shown in a compact coin badge for the account menu. */
function PaidCreditCoin({ count }: { count: number }) {
  const active = count > 0;

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full border",
        "h-6 min-w-6 px-1",
        "font-display text-[11px] font-bold leading-none tabular-nums tracking-tight",
        active
          ? "border-accent/55 bg-accent/[0.08] text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
          : "border-ink/20 bg-ink/[0.04] text-ink/35",
      ].join(" ")}
      aria-hidden="true"
    >
      {count}
    </span>
  );
}

function creditsRowClassName(): string {
  return "mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-snug text-ink/70";
}

export function CreditsSummary({ credits }: { credits: CreditsStatus }) {
  const { freeRemaining, paidCredits } = credits;

  if (freeRemaining > 0 && paidCredits > 0) {
    return (
      <p className={creditsRowClassName()}>
        <span className="inline-flex items-baseline gap-1">
          <span className={creditCountClassName(freeRemaining)}>{freeRemaining}</span>
          <span>free {freeRemaining === 1 ? "spin" : "spins"}</span>
        </span>
        <span className="text-ink/30" aria-hidden="true">
          ·
        </span>
        <span
          className="inline-flex items-center gap-1.5"
          aria-label={`${paidCredits} paid ${paidCredits === 1 ? "credit" : "credits"}`}
        >
          <PaidCreditCoin count={paidCredits} />
          <span aria-hidden="true">
            paid {paidCredits === 1 ? "credit" : "credits"}
          </span>
        </span>
      </p>
    );
  }

  if (freeRemaining > 0) {
    return (
      <p className={creditsRowClassName()}>
        <span className="inline-flex items-baseline gap-1">
          <span className={creditCountClassName(freeRemaining)}>{freeRemaining}</span>
          <span>free {freeRemaining === 1 ? "spin" : "spins"} left</span>
        </span>
      </p>
    );
  }

  if (paidCredits > 0) {
    return (
      <p className={creditsRowClassName()}>
        <span
          className="inline-flex items-center gap-1.5"
          aria-label={`${paidCredits} paid ${paidCredits === 1 ? "credit" : "credits"}`}
        >
          <PaidCreditCoin count={paidCredits} />
          <span aria-hidden="true">
            paid {paidCredits === 1 ? "credit" : "credits"}
          </span>
        </span>
      </p>
    );
  }

  return (
    <p className="mt-1.5 text-sm font-medium text-ink/45">No credits remaining</p>
  );
}
