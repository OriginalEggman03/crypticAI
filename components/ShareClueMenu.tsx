"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  SHARE_PLATFORMS,
  buildClueShareMessage,
  canUseNativeShare,
  shareUrlForPlatform,
  siteUrlForSharing,
  type SharePlatform,
} from "@/lib/share-clue";

interface ShareClueMenuProps {
  clueText: string;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export function ShareClueMenu({
  clueText,
  className = "",
  onOpenChange,
}: ShareClueMenuProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const setMenuOpen = useCallback(
    (value: boolean) => {
      setOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange]
  );

  const close = useCallback(() => setMenuOpen(false), [setMenuOpen]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function shareVia(platform: SharePlatform) {
    const siteUrl = siteUrlForSharing();
    const message = buildClueShareMessage(clueText, siteUrl);

    if (platform === "copy") {
      try {
        await navigator.clipboard.writeText(message);
        setFeedback("Copied to clipboard");
      } catch {
        setFeedback("Could not copy — try another option");
      }
      close();
      return;
    }

    const url = shareUrlForPlatform(platform, message, siteUrl);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    close();
  }

  async function nativeShare() {
    const message = buildClueShareMessage(clueText, siteUrlForSharing());
    try {
      await navigator.share({
        title: "Cryptic crossword clue",
        text: message,
      });
      close();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setFeedback("Sharing unavailable — pick a platform below");
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setMenuOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-cream/80"
      >
        <ShareIcon />
        Share
      </button>

      {feedback && (
        <p
          role="status"
          className="absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-paper shadow-md"
        >
          {feedback}
        </p>
      )}

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Share clue"
          className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-ink/10 bg-paper py-1 shadow-lg"
        >
          {canUseNativeShare() && (
            <button
              type="button"
              role="menuitem"
              onClick={nativeShare}
              className="flex w-full px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-cream/80"
            >
              More options…
            </button>
          )}
          {canUseNativeShare() && (
            <div className="my-1 border-t border-ink/10" aria-hidden="true" />
          )}
          {SHARE_PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              type="button"
              role="menuitem"
              onClick={() => shareVia(platform.id)}
              className="flex w-full px-3 py-2.5 text-left text-sm text-ink/85 transition hover:bg-cream/80"
            >
              {platform.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 text-ink/70"
    >
      <path d="M13 3a2 2 0 1 1 .001 3.999A2 2 0 0 1 13 3zm-8 6a2 2 0 1 1 .001 3.999A2 2 0 0 1 5 9zm8 6a2 2 0 1 1 .001 3.999A2 2 0 0 1 13 15z" />
      <path
        fillRule="evenodd"
        d="M7.293 9.707a1 1 0 0 1 1.414-1.414l4-4a1 1 0 0 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0zm0 4.586a1 1 0 0 0 1.414 0l4-4a1 1 0 0 0-1.414-1.414l-4 4a1 1 0 0 0 0 1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}
