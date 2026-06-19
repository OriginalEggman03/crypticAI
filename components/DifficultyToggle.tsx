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
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {difficultyOptions.map((option) => (
          <label
            key={option.value}
            className={`inline-flex cursor-pointer items-center gap-1.5 text-sm ${
              disabled ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <input
              type="radio"
              name="difficulty"
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="h-3.5 w-3.5 border-ink/25 text-accent focus:ring-accent/30"
            />
            <span className="text-ink/85">{option.label}</span>
            <span className="text-xs text-ink/50">({option.hint})</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
