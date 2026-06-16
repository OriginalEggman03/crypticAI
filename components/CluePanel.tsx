"use client";

import type { CrosswordPuzzle, PlacedEntry } from "@/lib/types";

interface CluePanelProps {
  puzzle: CrosswordPuzzle;
  activeEntry: PlacedEntry | null;
  onSelect: (entry: PlacedEntry) => void;
}

function ClueList({
  direction,
  entries,
  activeEntry,
  onSelect,
}: {
  direction: "across" | "down";
  entries: PlacedEntry[];
  activeEntry: PlacedEntry | null;
  onSelect: (entry: PlacedEntry) => void;
}) {
  const filtered = entries
    .filter((e) => e.direction === direction)
    .sort((a, b) => a.number - b.number);

  if (filtered.length === 0) return null;

  const label = direction === "across" ? "Across" : "Down";

  return (
    <section className="mb-5">
      <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-accent">
        {label}
      </h3>
      <ol className="space-y-2">
        {filtered.map((entry) => {
          const active = activeEntry?.id === entry.id;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm leading-snug transition ${
                  active
                    ? "bg-[#f3ede3] font-medium ring-1 ring-ink/10"
                    : "hover:bg-cream/80"
                }`}
              >
                <span className="font-semibold text-ink/70">
                  {entry.number}.
                </span>{" "}
                {entry.clue}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function CluePanel({
  puzzle,
  activeEntry,
  onSelect,
}: CluePanelProps) {
  return (
    <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-ink/10 bg-white/60 p-4 shadow-inner">
      <ClueList
        direction="across"
        entries={puzzle.entries}
        activeEntry={activeEntry}
        onSelect={onSelect}
      />
      <ClueList
        direction="down"
        entries={puzzle.entries}
        activeEntry={activeEntry}
        onSelect={onSelect}
      />
    </div>
  );
}
