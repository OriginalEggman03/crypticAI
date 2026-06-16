"use client";

import { CLUE_TYPE_OPTIONS } from "@/lib/clue-types";
import type { UserPreferences } from "@/lib/types";

interface PreferenceFormProps {
  preferences: UserPreferences;
  onChange: (prefs: UserPreferences) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function PreferenceForm({
  preferences,
  onChange,
  onSubmit,
  loading,
}: PreferenceFormProps) {
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink/80">
          Crossword Inspiration
        </span>
        <textarea
          rows={4}
          value={preferences.inspiration}
          onChange={(e) =>
            onChange({ ...preferences, inspiration: e.target.value })
          }
          placeholder="e.g. jazz, sourdough, Kyoto, Mum, parkrun, Marvel, craft beer — add as many buzzwords or topics as you like"
          className="w-full resize-y rounded-lg border border-ink/15 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink/80">
          Clue type
        </span>
        <select
          value={preferences.clueType}
          onChange={(e) =>
            onChange({
              ...preferences,
              clueType: e.target.value as UserPreferences["clueType"],
            })
          }
          className="w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        >
          {CLUE_TYPE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-ink/55">
          {preferences.clueType === "all"
            ? "Each clue will use a random mix of the listed types."
            : "Every clue in the puzzle will use this type."}
        </p>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-paper shadow-md transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Setting clues…" : "Build my cryptic crossword"}
      </button>
    </form>
  );
}
