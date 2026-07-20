"use client";

interface ClueStructureExplainerProps {
  children: string;
}

/** Collapsed “What is it?” disclosure for teaching cryptic clue structure. */
export function ClueStructureExplainer({
  children,
}: ClueStructureExplainerProps) {
  return (
    <details className="group text-sm">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 font-medium text-accent outline-none transition hover:text-accent/80 focus-visible:ring-2 focus-visible:ring-accent/30 [&::-webkit-details-marker]:hidden">
        What is it?
        <span
          aria-hidden
          className="inline-block text-xs transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <p className="mt-2 leading-relaxed text-ink/70">{children}</p>
    </details>
  );
}
