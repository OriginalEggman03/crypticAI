"use client";

import { useEffect, useState } from "react";
import { BuyCreditsButtons } from "@/components/BuyCreditsButtons";
import { ClueStructureExplainer } from "@/components/ClueStructureExplainer";
import { HOMOPHONE_INTRO } from "@/lib/site-config";
import type { CreditPackId } from "@/lib/credit-packs";

interface HomophoneFormProps {
  onSubmit: () => void;
  loading: boolean;
  canGenerate?: boolean;
  onBuyCredits?: (packId: CreditPackId) => void;
  checkoutPackId?: CreditPackId | null;
}

export function HomophoneForm({
  onSubmit,
  loading,
  canGenerate = true,
  onBuyCredits,
  checkoutPackId,
}: HomophoneFormProps) {
  const [showCreditPacks, setShowCreditPacks] = useState(false);

  useEffect(() => {
    if (canGenerate) setShowCreditPacks(false);
  }, [canGenerate]);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canGenerate) return;
        onSubmit();
      }}
    >
      <ClueStructureExplainer>{HOMOPHONE_INTRO}</ClueStructureExplainer>

      {canGenerate ? (
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-paper shadow-md transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      ) : showCreditPacks && onBuyCredits ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink/70">Choose a credit pack</p>
          <BuyCreditsButtons
            onBuy={onBuyCredits}
            loadingPackId={checkoutPackId}
            emphasis="need-credits"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreditPacks(true)}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-paper shadow-md transition hover:bg-accent/90"
        >
          Get Credits
        </button>
      )}
    </form>
  );
}
