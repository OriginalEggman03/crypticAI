"use client";

import { useEffect, useState } from "react";

interface ClueImprovementEditorProps {
  originalClue: string;
  clueText: string;
  improvementNotes: string;
  onApply: (clueText: string, improvementNotes: string) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function ClueImprovementEditor({
  originalClue,
  clueText,
  improvementNotes,
  onApply,
  onReset,
  disabled = false,
}: ClueImprovementEditorProps) {
  const [open, setOpen] = useState(false);
  const [draftClue, setDraftClue] = useState(clueText);
  const [draftNotes, setDraftNotes] = useState(improvementNotes);
  const [error, setError] = useState<string | null>(null);

  const isEdited =
    clueText.trim() !== originalClue.trim() || improvementNotes.trim().length > 0;

  useEffect(() => {
    if (!open) {
      setDraftClue(clueText);
      setDraftNotes(improvementNotes);
      setError(null);
    }
  }, [clueText, improvementNotes, open]);

  function apply() {
    const nextClue = draftClue.trim();
    const nextNotes = draftNotes.trim();

    if (!nextClue) {
      setError("Clue text cannot be empty.");
      return;
    }

    if (nextClue !== originalClue.trim() && !nextNotes) {
      setError("Add a short note on how you improved the clue.");
      return;
    }

    onApply(nextClue, nextNotes);
    setOpen(false);
    setError(null);
  }

  function cancel() {
    setDraftClue(clueText);
    setDraftNotes(improvementNotes);
    setError(null);
    setOpen(false);
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            Improve this clue
          </h3>
          <p className="mt-1 text-sm text-ink/60">
            Rewrite the surface reading, then note what you changed and why.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={disabled}
            className="rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-cream/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEdited ? "Edit again" : "Rewrite clue"}
          </button>
        )}
      </div>

      {isEdited && !open && (
        <div className="mt-4 space-y-3 rounded-xl border border-ink/10 bg-cream/40 p-4 text-sm">
          {clueText.trim() !== originalClue.trim() && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                AI version
              </p>
              <p className="mt-1 leading-relaxed text-ink/70">{originalClue}</p>
            </div>
          )}
          {improvementNotes.trim() && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                How it was improved
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed text-ink">
                {improvementNotes}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="text-sm font-medium text-ink/55 underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
          >
            Restore AI clue
          </button>
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink/80">
              Clue text
            </span>
            <textarea
              value={draftClue}
              onChange={(e) => setDraftClue(e.target.value)}
              rows={3}
              disabled={disabled}
              className="w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2 font-display text-base leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink/80">
              How you improved it
            </span>
            <textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              rows={3}
              disabled={disabled}
              placeholder="e.g. Smoother surface reading; swapped indicator to avoid repetition."
              className="w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={apply}
              disabled={disabled}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply changes
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={disabled}
              className="rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-cream/80 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
