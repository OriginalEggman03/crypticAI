/** Public site URL and SEO constants. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
  process.env.APP_URL?.trim().replace(/\/$/, "") ||
  "https://www.crypticai.uk";

export const SITE_NAME = "Cryptic AI";
export const SITE_NAME_ALT = "CrypticAI";

export const SITE_TAGLINE = "Anagram clue builder";

export const SITE_DESCRIPTION =
  "Cryptic AI generates verified British cryptic anagram clues from any theme. Sign up for free spins, buy credits, and archive your best clues.";

export const SITE_KEYWORDS = [
  "cryptic ai",
  "cryptic AI",
  "CrypticAI",
  "cryptic crossword",
  "anagram clue builder",
  "anagram clue generator",
  "cryptic clue generator",
  "British cryptic crossword",
  "AI crossword clues",
  "anagram crossword",
];
