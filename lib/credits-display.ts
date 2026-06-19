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
