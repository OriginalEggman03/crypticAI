"use client";

import {
  CREDIT_PACK_LIST,
  type CreditPackId,
  creditPackButtonLabel,
} from "@/lib/credit-packs";

interface BuyCreditsButtonsProps {
  onBuy: (packId: CreditPackId) => void;
  loadingPackId?: CreditPackId | null;
  /** Primary styling for the first button when out of credits. */
  emphasis?: "need-credits" | "optional";
}

export function BuyCreditsButtons({
  onBuy,
  loadingPackId,
  emphasis = "optional",
}: BuyCreditsButtonsProps) {
  const isLoading = loadingPackId != null;

  return (
    <div className="flex flex-wrap gap-2">
      {CREDIT_PACK_LIST.map((pack, index) => {
        const isPrimary =
          emphasis === "need-credits" && index === CREDIT_PACK_LIST.length - 1;
        const isLoadingThis = loadingPackId === pack.id;

        return (
          <button
            key={pack.id}
            type="button"
            onClick={() => onBuy(pack.id)}
            disabled={isLoading}
            className={
              isPrimary
                ? "rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-accent/90 disabled:opacity-60"
                : "rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/75 transition hover:bg-cream/80 disabled:opacity-60"
            }
          >
            {isLoadingThis ? "Redirecting…" : creditPackButtonLabel(pack)}
          </button>
        );
      })}
    </div>
  );
}
