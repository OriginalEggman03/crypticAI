"use client";

import { useEffect } from "react";
import type { ClueExplanation } from "@/lib/types";

interface ExplainModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  clue: string | null;
  answer: string | null;
  entryLabel: string | null;
  explanation: ClueExplanation | null;
  onClose: () => void;
}

export function ExplainModal({
  open,
  loading,
  error,
  clue,
  answer,
  entryLabel,
  explanation,
  onClose,
}: ExplainModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="explain-title"
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink/10 bg-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-accent">
              {entryLabel ?? "Clue"}
            </p>
            <h2 id="explain-title" className="mt-1 font-display text-xl font-bold text-ink">
              Explain Answer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-ink/60 hover:bg-cream hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {clue && (
          <blockquote className="mb-1 border-l-2 border-accent/40 pl-3 text-sm italic text-ink/80">
            {clue}
          </blockquote>
        )}
        {answer && (
          <p className="mb-4 font-mono text-sm font-semibold text-accent">
            → {answer}
          </p>
        )}

        {loading && (
          <p className="text-sm text-ink/60">Analysing the wordplay…</p>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {explanation && !loading && (
          <div className="space-y-4 text-sm leading-relaxed text-ink/85">
            <div>
              <h3 className="mb-1 font-semibold text-ink">Clue type</h3>
              <p>{explanation.clueType}</p>
            </div>

            <div>
              <h3 className="mb-1 font-semibold text-ink">Definition</h3>
              <p>{explanation.definition}</p>
            </div>

            <div>
              <h3 className="mb-1 font-semibold text-ink">Wordplay</h3>
              <p>{explanation.wordplay}</p>
            </div>

            {explanation.parts?.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold text-ink">Clue breakdown</h3>
                <ul className="space-y-1.5">
                  {explanation.parts.map((part, i) => (
                    <li
                      key={`${part.text}-${i}`}
                      className="rounded-md bg-cream/80 px-3 py-2"
                    >
                      <span className="font-medium">&ldquo;{part.text}&rdquo;</span>
                      <span className="text-ink/60"> — {part.role}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="mb-1 font-semibold text-ink">Walkthrough</h3>
              <p>{explanation.walkthrough}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
