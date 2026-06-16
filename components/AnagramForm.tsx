"use client";

import { DifficultyToggle } from "@/components/DifficultyToggle";
import type { AnagramRequest } from "@/lib/types";

interface AnagramFormProps {
  request: AnagramRequest;
  onChange: (req: AnagramRequest) => void;
  onSubmit: () => void;
  loading: boolean;
  canGenerate?: boolean;
  onBuyCredits?: () => void;
}

export function AnagramForm({
  request,
  onChange,
  onSubmit,
  loading,
  canGenerate = true,
  onBuyCredits,
}: AnagramFormProps) {
  const difficulty = request.difficulty ?? "easy";

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <p className="mb-2 text-sm font-medium text-ink/80">Difficulty</p>
        <DifficultyToggle
          value={difficulty}
          onChange={(next) => onChange({ ...request, difficulty: next })}
          disabled={loading}
        />
      </div>

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
          placeholder="e.g. jazz, coffee, Marvel"
          className="w-full resize-y rounded-lg border border-ink/15 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>

      {!canGenerate && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No credits left.{" "}
          {onBuyCredits ? (
            <button
              type="button"
              onClick={onBuyCredits}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Add credits
            </button>
          ) : (
            "Add credits to generate more clues."
          )}
        </p>
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
