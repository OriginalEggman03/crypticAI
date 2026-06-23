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

export function CreditsSummary({ credits }: { credits: CreditsStatus }) {
  const { freeRemaining, paidCredits } = credits;

  if (freeRemaining > 0 && paidCredits > 0) {
    return (
      <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
        <span className={creditCountClassName(freeRemaining)}>{freeRemaining}</span>
        <span className="ml-1">
          free {freeRemaining === 1 ? "spin" : "spins"}
        </span>
        <span className="mx-1.5 text-ink/30">·</span>
        <span className={creditCountClassName(paidCredits)}>{paidCredits}</span>
        <span className="ml-1">
          paid {paidCredits === 1 ? "credit" : "credits"}
        </span>
      </p>
    );
  }

  if (freeRemaining > 0) {
    return (
      <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
        <span className={creditCountClassName(freeRemaining)}>{freeRemaining}</span>
        <span className="ml-1">
          free {freeRemaining === 1 ? "spin" : "spins"} left
        </span>
      </p>
    );
  }

  if (paidCredits > 0) {
    return (
      <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
        <span className={creditCountClassName(paidCredits)}>{paidCredits}</span>
        <span className="ml-1">
          paid {paidCredits === 1 ? "credit" : "credits"}
        </span>
      </p>
    );
  }

  return (
    <p className="mt-1.5 text-sm font-medium text-ink/45">No credits remaining</p>
  );
}
