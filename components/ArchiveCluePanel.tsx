"use client";

import { useEffect, useState } from "react";
import { StarRating } from "@/components/StarRating";
import type { AnagramClueDraft, AnagramDifficulty, ArchivedClue } from "@/lib/types";

interface ArchiveCluePanelProps {
  inspiration: string;
  difficulty: AnagramDifficulty;
  clue: AnagramClueDraft;
  displayClue: string;
  originalClue: string;
  improvementNotes: string;
  variant?: "anagram" | "homophone";
}

export function ArchiveCluePanel({
  inspiration,
  difficulty,
  clue,
  displayClue,
  originalClue,
  improvementNotes,
  variant = "anagram",
}: ArchiveCluePanelProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ArchivedClue | null>(null);

  useEffect(() => {
    setRating(null);
    setError(null);
    setSaved(null);
  }, [
    clue.clue,
    clue.answer,
    inspiration,
    difficulty,
    displayClue,
    improvementNotes,
  ]);

  const archive = async () => {
    if (rating === null) {
      setError("Choose a star rating from 1 to 5 before saving.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const rewritten = displayClue.trim() !== originalClue.trim();
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspiration,
          difficulty,
          answer: clue.answer,
          clue: displayClue.trim(),
          originalClue: rewritten ? originalClue.trim() : undefined,
          improvementNotes: improvementNotes.trim() || undefined,
          anagramFodder: clue.anagramFodder,
          anagramIndicator: clue.anagramIndicator,
          rating,
        }),
      });

      const data = (await res.json()) as {
        archived?: ArchivedClue;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Could not save to archive");
      }

      setSaved(data.archived ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save to archive");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/50 p-6">
      <h3 className="mb-1 font-display text-lg font-semibold text-ink">
        Save to archive
      </h3>
      <p className="mb-4 text-sm text-ink/60">
        {variant === "homophone"
          ? "Rate this homophone clue and add it to your searchable archive."
          : "Rate this anagram and add it to the searchable archive."}
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <StarRating
          value={rating}
          onChange={setRating}
          disabled={saving || saved !== null}
          label="Your rating (required)"
        />
        <button
          type="button"
          onClick={archive}
          disabled={saving || saved !== null || rating === null}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saved ? "Saved" : saving ? "Saving…" : "Archive clue"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {saved && (
        <p className="mt-3 text-sm text-emerald-800">
          Clue archived with {saved.rating} star{saved.rating === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}
