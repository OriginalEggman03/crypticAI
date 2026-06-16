"use client";

import type { AnagramDifficulty } from "@/lib/types";

const difficultyOptions: {
  value: AnagramDifficulty;
  label: string;
  hint: string;
}[] = [
  {
    value: "easy",
    label: "Easy",
    hint: "3–10 letters",
  },
  {
    value: "hard",
    label: "Hard",
    hint: "8+ letters, no max",
  },
];

interface DifficultyToggleProps {
  value: AnagramDifficulty;
  onChange: (difficulty: AnagramDifficulty) => void;
  disabled?: boolean;
}

export function DifficultyToggle({
  value,
  onChange,
  disabled = false,
}: DifficultyToggleProps) {
  return (
    <fieldset className="block" disabled={disabled}>
      <legend className="sr-only">Difficulty</legend>
      <div className="grid grid-cols-2 gap-2">
        {difficultyOptions.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "border-accent bg-accent/10 text-ink shadow-sm"
                  : "border-ink/15 bg-white/80 text-ink/75 hover:border-ink/25"
              }`}
            >
              <span className="block font-semibold">{option.label}</span>
              <span className="block text-xs text-ink/55">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
