"use client";

import { useCallback, useState } from "react";
import { StarDisplay } from "@/components/StarRating";
import { ShareClueMenu } from "@/components/ShareClueMenu";
import { difficultyLabel } from "@/lib/anagram-difficulty";
import type { AnagramDifficulty, ArchivedClue } from "@/lib/types";

interface SearchFilters {
  inspiration: string;
  difficulty: "" | AnagramDifficulty;
  rating: "" | "1" | "2" | "3" | "4" | "5";
  minRating: "" | "1" | "2" | "3" | "4" | "5";
}

const emptyFilters: SearchFilters = {
  inspiration: "",
  difficulty: "",
  rating: "",
  minRating: "",
};

export function ClueArchiveSearch() {
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [results, setResults] = useState<ArchivedClue[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExpandedId(null);

    const params = new URLSearchParams();
    if (filters.inspiration.trim()) {
      params.set("inspiration", filters.inspiration.trim());
    }
    if (filters.difficulty) {
      params.set("difficulty", filters.difficulty);
    }
    if (filters.rating) {
      params.set("rating", filters.rating);
    } else if (filters.minRating) {
      params.set("minRating", filters.minRating);
    }

    try {
      const res = await fetch(`/api/archive?${params.toString()}`);
      const data = (await res.json()) as {
        results?: ArchivedClue[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Search failed");
      }

      setResults(data.results ?? []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const clear = () => {
    setFilters(emptyFilters);
    setResults([]);
    setSearched(false);
    setError(null);
    setExpandedId(null);
  };

  return (
    <section className="rounded-2xl border border-ink/10 bg-white/40 p-6 shadow-sm">
      <h2 className="mb-1 font-display text-xl font-semibold text-ink">
        Search archive
      </h2>
      <p className="mb-4 text-sm text-ink/60">
        Filter by inspiration, difficulty, and star rating — use any combination.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-ink/80">
            Inspiration
          </span>
          <input
            type="search"
            value={filters.inspiration}
            onChange={(e) =>
              setFilters((f) => ({ ...f, inspiration: e.target.value }))
            }
            placeholder="e.g. Mortal Kombat, jazz…"
            className="w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink/80">
            Difficulty
          </span>
          <select
            value={filters.difficulty}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                difficulty: e.target.value as SearchFilters["difficulty"],
              }))
            }
            className="w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Any</option>
            <option value="easy">Easy</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink/80">
            Star rating
          </span>
          <select
            value={filters.rating || filters.minRating ? (filters.rating || `min:${filters.minRating}`) : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setFilters((f) => ({ ...f, rating: "", minRating: "" }));
              } else if (v.startsWith("min:")) {
                setFilters((f) => ({
                  ...f,
                  rating: "",
                  minRating: v.slice(4) as SearchFilters["minRating"],
                }));
              } else {
                setFilters((f) => ({
                  ...f,
                  rating: v as SearchFilters["rating"],
                  minRating: "",
                }));
              }
            }}
            className="w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Any</option>
            <option value="5">Exactly 5 stars</option>
            <option value="4">Exactly 4 stars</option>
            <option value="3">Exactly 3 stars</option>
            <option value="2">Exactly 2 stars</option>
            <option value="1">Exactly 1 star</option>
            <option value="min:4">4 stars and above</option>
            <option value="min:3">3 stars and above</option>
            <option value="min:2">2 stars and above</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-paper hover:bg-accent/90 disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={loading}
          className="rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-cream/80"
        >
          Clear
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {searched && !loading && !error && (
        <p className="mt-4 text-sm text-ink/60">
          {results.length === 0
            ? "No archived clues match your filters."
            : `${results.length} archived clue${results.length === 1 ? "" : "s"} found.`}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-4 space-y-3">
          {results.map((item) => {
            const expanded = expandedId === item.id;

            return (
              <li
                key={item.id}
                className="rounded-xl border border-ink/10 bg-cream/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expanded ? null : item.id)
                  }
                  aria-expanded={expanded}
                  className="w-full px-4 py-4 text-left transition hover:bg-cream/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                >
                  <p className="font-display text-base leading-relaxed text-ink">
                    {item.clue}
                  </p>
                  {!expanded && (
                    <span className="mt-2 block text-xs font-medium text-ink/45">
                      Click for details
                    </span>
                  )}
                </button>

                {expanded && (
                  <div className="border-t border-ink/10 bg-white/50 px-4 py-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/55">
                        <span className="font-medium text-ink/75">
                          {item.inspiration}
                        </span>
                        <span>{difficultyLabel(item.difficulty)}</span>
                        <StarDisplay rating={item.rating} />
                        <time dateTime={item.createdAt}>
                          {new Date(item.createdAt + "Z").toLocaleDateString(
                            undefined,
                            { dateStyle: "medium" }
                          )}
                        </time>
                      </div>
                      <ShareClueMenu clueText={item.clue} />
                    </div>

                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-ink/55">Answer</dt>
                        <dd className="font-mono font-semibold text-ink">
                          {item.answer}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink/55">Anagram fodder</dt>
                        <dd className="font-mono text-ink">
                          {item.anagramFodder || "—"}
                        </dd>
                      </div>
                      {item.anagramIndicator && (
                        <div className="sm:col-span-2">
                          <dt className="text-ink/55">Indicator</dt>
                          <dd className="text-ink">{item.anagramIndicator}</dd>
                        </div>
                      )}
                    </dl>

                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      className="mt-4 text-sm font-medium text-ink/55 underline-offset-2 hover:text-ink hover:underline"
                    >
                      Hide details
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
