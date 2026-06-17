"use client";

import type { CreditPackId } from "@/lib/credit-packs";
import type { AuthMeResponse } from "@/lib/types";
import { BuyCreditsButtons } from "@/components/BuyCreditsButtons";

interface CreditsBarProps {
  session: AuthMeResponse;
  onBuyCredits: (packId: CreditPackId) => void;
  checkoutPackId?: CreditPackId | null;
}

export function CreditsBar({
  session,
  onBuyCredits,
  checkoutPackId,
}: CreditsBarProps) {
  const { credits } = session;
  const freeRemaining = credits?.freeRemaining ?? 0;
  const paidCredits = credits?.paidCredits ?? 0;
  const canGenerate = credits?.canGenerate ?? false;

  return (
    <div className="mb-8 rounded-xl border border-ink/10 bg-white/50 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink/55">
          {freeRemaining > 0 ? (
            <>
              <span className="font-mono text-ink/70">{freeRemaining}</span> free{" "}
              {freeRemaining === 1 ? "spin" : "spins"} left
              {paidCredits > 0 && (
                <>
                  {" "}
                  · <span className="font-mono text-ink/70">{paidCredits}</span>{" "}
                  paid credits
                </>
              )}
            </>
          ) : paidCredits > 0 ? (
            <>
              <span className="font-mono text-ink/70">{paidCredits}</span> paid{" "}
              {paidCredits === 1 ? "credit" : "credits"}
            </>
          ) : (
            <>No free spins left — add credits to generate more</>
          )}
        </p>

        <BuyCreditsButtons
          onBuy={onBuyCredits}
          loadingPackId={checkoutPackId}
          emphasis={canGenerate ? "optional" : "need-credits"}
        />
      </div>
    </div>
  );
}
