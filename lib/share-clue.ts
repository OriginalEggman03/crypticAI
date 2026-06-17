export type SharePlatform =
  | "whatsapp"
  | "facebook"
  | "x"
  | "linkedin"
  | "reddit"
  | "email"
  | "copy";

export interface SharePlatformOption {
  id: SharePlatform;
  label: string;
}

export const SHARE_PLATFORMS: SharePlatformOption[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "reddit", label: "Reddit" },
  { id: "email", label: "Email" },
  { id: "copy", label: "Copy text" },
];

const DEFAULT_SITE_URL = "https://www.crypticai.uk";

export function siteUrlForSharing(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
}

export function buildClueShareMessage(
  clueText: string,
  siteUrl = siteUrlForSharing()
): string {
  return [
    "Cryptic crossword clue:",
    "",
    clueText.trim(),
    "",
    `Can you solve it? Made with CrypticAI — ${siteUrl}`,
  ].join("\n");
}

export function shareUrlForPlatform(
  platform: SharePlatform,
  message: string,
  siteUrl: string
): string | null {
  const encodedMessage = encodeURIComponent(message);
  const encodedUrl = encodeURIComponent(siteUrl);

  switch (platform) {
    case "whatsapp":
      return `https://wa.me/?text=${encodedMessage}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodedMessage}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case "reddit":
      return `https://www.reddit.com/submit?title=${encodeURIComponent("Cryptic crossword clue")}&text=${encodedMessage}`;
    case "email":
      return `mailto:?subject=${encodeURIComponent("Cryptic crossword clue")}&body=${encodedMessage}`;
    case "copy":
      return null;
  }
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
