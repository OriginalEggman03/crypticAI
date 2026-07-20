"use client";

import { useEffect, useState } from "react";
import { BuyCreditsButtons } from "@/components/BuyCreditsButtons";
import { ClueStructureExplainer } from "@/components/ClueStructureExplainer";
import { DifficultyToggle } from "@/components/DifficultyToggle";
import { ANAGRAM_INTRO } from "@/lib/site-config";
import type { CreditPackId } from "@/lib/credit-packs";
import type { AnagramRequest } from "@/lib/types";

interface AnagramFormProps {
  request: AnagramRequest;
  onChange: (req: AnagramRequest) => void;
  onSubmit: () => void;
  loading: boolean;
  canGenerate?: boolean;
  onBuyCredits?: (packId: CreditPackId) => void;
  checkoutPackId?: CreditPackId | null;
}

export function AnagramForm({
  request,
  onChange,
  onSubmit,
  loading,
  canGenerate = true,
  onBuyCredits,
  checkoutPackId,
}: AnagramFormProps) {
  const difficulty = request.difficulty ?? "easy";
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
      <ClueStructureExplainer>{ANAGRAM_INTRO}</ClueStructureExplainer>

      <DifficultyToggle
        value={difficulty}
        onChange={(next) => onChange({ ...request, difficulty: next })}
        disabled={loading}
      />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink/80">
          Inspiration{" "}
          <span className="font-normal text-ink/50">(optional)</span>
        </span>
        <textarea
          rows={4}
          value={request.inspiration}
          onChange={(e) =>
            onChange({ ...request, inspiration: e.target.value })
          }
          className="w-full resize-y rounded-lg border border-ink/15 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>

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
