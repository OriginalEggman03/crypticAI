"use client";

import { useCallback, useEffect, useState } from "react";

interface CopyClueButtonProps {
  text: string;
  className?: string;
}

export function CopyClueButton({ text, className = "" }: CopyClueButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text.trim());
      setFeedback("Copied");
    } catch {
      setFeedback("Copy failed");
    }
  }, [text]);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-cream/80"
      >
        <CopyIcon />
        Copy text
      </button>

      {feedback && (
        <p
          role="status"
          className="absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-paper shadow-md"
        >
          {feedback}
        </p>
      )}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 text-ink/70"
    >
      <path d="M6 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.83a2 2 0 0 0-.59-1.41l-2.83-2.83A2 2 0 0 0 11.17 3H6zm0 2h4v3a1 1 0 0 0 1 1h3v7H6V5zm6-1.17L15.17 6H12V3.83z" />
      <path d="M4 7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1h-2v1H4V9h1V7H4z" />
    </svg>
  );
}
