"use client";

import { BuyCreditsButtons } from "@/components/BuyCreditsButtons";
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
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <p className="text-sm leading-relaxed text-ink/70">{HOMOPHONE_INTRO}</p>

      {!canGenerate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>No credits left.</p>
          {onBuyCredits ? (
            <div className="mt-3">
              <BuyCreditsButtons
                onBuy={onBuyCredits}
                loadingPackId={checkoutPackId}
                emphasis="need-credits"
              />
            </div>
          ) : (
            <p className="mt-1">Add credits to generate more clues.</p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !canGenerate}
        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-paper shadow-md transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
