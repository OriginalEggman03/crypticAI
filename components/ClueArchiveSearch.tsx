"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StarDisplay } from "@/components/StarRating";
import { InspirationArchiveInput } from "@/components/InspirationArchiveInput";
import { CopyClueButton } from "@/components/CopyClueButton";
import { ShareClueMenu } from "@/components/ShareClueMenu";
import { difficultyLabel } from "@/lib/anagram-difficulty";
import { HOMOPHONE_ARCHIVE_INSPIRATION } from "@/lib/site-config";
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

interface ClueArchiveSearchProps {
  isLoggedIn: boolean;
  authReady: boolean;
  onSignUp: () => void;
  variant?: "anagram" | "homophone";
}

function filtersForVariant(variant: "anagram" | "homophone"): SearchFilters {
  if (variant === "homophone") {
    return { ...emptyFilters, inspiration: HOMOPHONE_ARCHIVE_INSPIRATION };
  }
  return { ...emptyFilters };
}

export function ClueArchiveSearch({
  isLoggedIn,
  authReady,
  onSignUp,
  variant = "anagram",
}: ClueArchiveSearchProps) {
  const isHomophone = variant === "homophone";
  const [filters, setFilters] = useState<SearchFilters>(() =>
    filtersForVariant(variant)
  );
  const [results, setResults] = useState<ArchivedClue[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openShareId, setOpenShareId] = useState<number | null>(null);

  const buildParams = useCallback(
    (nextFilters: SearchFilters) => {
      const params = new URLSearchParams();
      const inspiration = isHomophone
        ? HOMOPHONE_ARCHIVE_INSPIRATION
        : nextFilters.inspiration.trim();
      if (inspiration) {
        params.set("inspiration", inspiration);
      }
      if (!isHomophone && nextFilters.difficulty) {
        params.set("difficulty", nextFilters.difficulty);
      }
    if (nextFilters.rating) {
      params.set("rating", nextFilters.rating);
    } else if (nextFilters.minRating) {
      params.set("minRating", nextFilters.minRating);
    }
    return params;
  },
    [isHomophone]
  );

  const runSearch = useCallback(
    async (nextFilters: SearchFilters) => {
      setLoading(true);
      setError(null);
      setExpandedId(null);
      setOpenShareId(null);

      try {
        const res = await fetch(`/api/archive?${buildParams(nextFilters).toString()}`);
        const data = (await res.json()) as {
          results?: ArchivedClue[];
          totalCount?: number;
          guestPreview?: boolean;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "Search failed");
        }

        setResults(data.results ?? []);
        setTotalCount(
          data.guestPreview && typeof data.totalCount === "number"
            ? data.totalCount
            : null
        );
        setSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
        setTotalCount(null);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  const search = useCallback(() => {
    if (!isLoggedIn) return;
    void runSearch(filters);
  }, [filters, isLoggedIn, runSearch]);

  const prevLoggedInRef = useRef<boolean | null>(null);

  const guestPreview = authReady && !isLoggedIn;

  useEffect(() => {
    if (!authReady) return;

    const wasLoggedIn = prevLoggedInRef.current;

    if (!isLoggedIn) {
      void runSearch(filtersForVariant(variant));
    } else if (wasLoggedIn === false || (isHomophone && wasLoggedIn === null)) {
      const nextFilters = filtersForVariant(variant);
      setFilters(nextFilters);
      setResults([]);
      setTotalCount(null);
      setSearched(false);
      setError(null);
      setExpandedId(null);
      setOpenShareId(null);
      if (isHomophone) {
        void runSearch(nextFilters);
      }
    }

    prevLoggedInRef.current = isLoggedIn;
  }, [authReady, isHomophone, isLoggedIn, runSearch, variant]);

  const clear = () => {
    if (!isLoggedIn) return;
    const nextFilters = filtersForVariant(variant);
    setFilters(nextFilters);
    setResults([]);
    setTotalCount(null);
    setSearched(false);
    setError(null);
    setExpandedId(null);
    setOpenShareId(null);
    if (isHomophone) {
      void runSearch(nextFilters);
    }
  };

  const hiddenCount =
    guestPreview && totalCount != null
      ? Math.max(0, totalCount - results.length)
      : 0;

  const disabledFieldClass =
    "disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-ink/45";

  return (
    <section className="rounded-2xl border border-ink/10 bg-white/40 p-6 shadow-sm">
      <h2 className="mb-4 font-display text-xl font-semibold text-ink">
        {isHomophone ? "Homophone archive" : "Search archive"}
      </h2>

      {!authReady ? (
        <p className="mb-4 text-sm text-ink/60">Loading…</p>
      ) : guestPreview ? (
        <p className="mb-4 text-sm text-ink/60">
          {isHomophone
            ? "Sign up to search and save homophone clues in your archive."
            : "Featured clues from the archive. Sign up to search the full collection."}
        </p>
      ) : isHomophone ? (
        <p className="mb-4 text-sm text-ink/60">
          Your saved homophone clues. Rate clues when you generate them to add
          new entries here.
        </p>
      ) : null}

      <div
        className={`grid gap-4 sm:grid-cols-2 ${
          guestPreview ? "opacity-60" : ""
        }`}
      >
        {!isHomophone && (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-ink/80">
              Inspiration
            </span>
            <InspirationArchiveInput
              value={filters.inspiration}
              onChange={(inspiration) =>
                setFilters((f) => ({ ...f, inspiration }))
              }
              disabled={guestPreview}
            />
          </label>
        )}

        {!isHomophone && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink/80">
              Difficulty
            </span>
            <select
              value={filters.difficulty}
              disabled={guestPreview}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  difficulty: e.target.value as SearchFilters["difficulty"],
                }))
              }
              className={`w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${disabledFieldClass}`}
            >
              <option value="">Any</option>
              <option value="easy">Easy</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        )}

        <label className={`block ${isHomophone ? "sm:col-span-2" : ""}`}>
          <span className="mb-1 block text-sm font-medium text-ink/80">
            Star rating
          </span>
          <select
            value={
              filters.rating || filters.minRating
                ? filters.rating || `min:${filters.minRating}`
                : ""
            }
            disabled={guestPreview}
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
            className={`w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${disabledFieldClass}`}
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

      <div className={`mt-4 flex flex-wrap gap-2 ${guestPreview ? "opacity-60" : ""}`}>
        <button
          type="button"
          onClick={search}
          disabled={loading || guestPreview}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-paper hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={loading || guestPreview}
          className={`rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-cream/80 disabled:cursor-not-allowed disabled:opacity-60 ${disabledFieldClass}`}
        >
          Clear
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {searched && !loading && !error && isLoggedIn && (
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
            const shareOpen = openShareId === item.id;

            return (
              <li
                key={item.id}
                className={`rounded-xl border border-ink/10 bg-cream/40 ${
                  expanded || shareOpen ? "relative z-20" : ""
                }`}
              >
                <div className="flex items-start gap-3 px-4 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expanded ? null : item.id)
                    }
                    aria-expanded={expanded}
                    className="min-w-0 flex-1 text-left transition hover:text-ink/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    <p className="font-display text-base leading-relaxed text-ink">
                      {item.clue}
                    </p>
                    {item.originalClue && !expanded && (
                      <span className="mt-2 block text-xs font-medium text-accent">
                        Human-edited
                      </span>
                    )}
                    {!expanded && (
                      <span className="mt-2 block text-xs font-medium text-ink/45">
                        Click for details
                      </span>
                    )}
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <CopyClueButton text={item.clue} />
                    <ShareClueMenu
                      clueText={item.clue}
                      onOpenChange={(open) =>
                        setOpenShareId(open ? item.id : null)
                      }
                    />
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-ink/10 bg-white/50 px-4 py-4">
                    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/55">
                      <span className="font-medium text-ink/75">
                        {isHomophone ? "Homophone" : item.inspiration}
                      </span>
                      {!isHomophone && (
                        <span>{difficultyLabel(item.difficulty)}</span>
                      )}
                      <StarDisplay rating={item.rating} />
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt + "Z").toLocaleDateString(
                          undefined,
                          { dateStyle: "medium" }
                        )}
                      </time>
                    </div>

                    {(item.originalClue || item.improvementNotes) && (
                      <div className="mb-4 space-y-3 rounded-xl border border-ink/10 bg-cream/40 p-4 text-sm">
                        {item.originalClue && (
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                              AI version
                            </dt>
                            <dd className="mt-1 leading-relaxed text-ink/70">
                              {item.originalClue}
                            </dd>
                          </div>
                        )}
                        {item.improvementNotes && (
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                              How it was improved
                            </dt>
                            <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-ink">
                              {item.improvementNotes}
                            </dd>
                          </div>
                        )}
                      </div>
                    )}

                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-ink/55">Answer</dt>
                        <dd className="font-mono font-semibold text-ink">
                          {item.answer}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink/55">
                          {isHomophone ? "Homophone word" : "Anagram fodder"}
                        </dt>
                        <dd className="font-mono text-ink">
                          {item.anagramFodder || "—"}
                        </dd>
                      </div>
                      {item.anagramIndicator && (
                        <div className="sm:col-span-2">
                          <dt className="text-ink/55">
                            {isHomophone
                              ? "Homophone indicator"
                              : "Indicator"}
                          </dt>
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

      {guestPreview && searched && !loading && !error && (
        <div className="mt-6 rounded-xl border border-accent/25 bg-gradient-to-b from-accent/10 to-cream/40 p-6 text-center">
          {hiddenCount > 0 ? (
            <p className="font-display text-lg font-semibold text-ink">
              {hiddenCount} more archived clue{hiddenCount === 1 ? "" : "s"} waiting
            </p>
          ) : (
            <p className="font-display text-lg font-semibold text-ink">
              Search and save your own clues
            </p>
          )}
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            Create a free account to search the full archive, filter by inspiration
            and rating, and save clues you generate.
          </p>
          <button
            type="button"
            onClick={onSignUp}
            className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent/90"
          >
            Sign up free
          </button>
        </div>
      )}
    </section>
  );
}
