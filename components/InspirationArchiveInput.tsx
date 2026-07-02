"use client";

import { useEffect, useId, useRef, useState } from "react";

interface InspirationArchiveInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function InspirationArchiveInput({
  value,
  onChange,
  disabled = false,
}: InspirationArchiveInputProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (disabled) return;

    fetch("/api/archive/inspirations")
      .then((res) => res.json())
      .then((data: { recent?: string[] }) => {
        setRecent(data.recent ?? []);
      })
      .catch(() => setRecent([]));
  }, [disabled]);

  useEffect(() => {
    if (disabled) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const query = value.trim();
    if (!query) {
      setSuggestions(recent);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/archive/inspirations?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data: { suggestions?: string[] }) => {
          setSuggestions(data.suggestions ?? []);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, recent, disabled]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const showList = open && suggestions.length > 0;

  function selectOption(option: string) {
    onChange(option);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        type="search"
        value={value}
        disabled={disabled}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          if (!disabled) setOpen(true);
        }}
        className="w-full rounded-lg border border-ink/15 bg-white/80 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-ink/45"
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Inspiration suggestions"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-ink/10 bg-paper py-1 shadow-lg"
        >
          {suggestions.map((option) => (
            <li key={option} role="option" aria-selected={value === option}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(option)}
                className="flex w-full px-3 py-2 text-left text-sm text-ink/85 transition hover:bg-cream/80"
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && loading && value.trim() && suggestions.length === 0 && (
        <p className="absolute z-10 mt-1 w-full rounded-lg border border-ink/10 bg-paper px-3 py-2 text-xs text-ink/50 shadow-lg">
          Searching…
        </p>
      )}
    </div>
  );
}
