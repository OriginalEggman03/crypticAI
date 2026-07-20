/** Public site URL and SEO constants. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
  process.env.APP_URL?.trim().replace(/\/$/, "") ||
  "https://www.crypticai.uk";

export const SITE_NAME = "Cryptic AI";
export const SITE_NAME_ALT = "CrypticAI";

export const SITE_TAGLINE = "Cryptic Clue Builder";
export const HOMOPHONE_TAGLINE = "Cryptic Clue Builder";

/** Stored as archive `inspiration` for homophone clues (no theme). */
export const HOMOPHONE_ARCHIVE_INSPIRATION = "Homophone";

/** Shown under “What is it?” on the anagram builder — how anagram clues work. */
export const ANAGRAM_INTRO =
  "An anagram clue has two parts joined into one natural sentence: a definition of the answer, " +
  "and fodder (letters to rearrange) marked by an anagram indicator such as “broken”, “mixed”, or “astray”. " +
  "Solve by finding which words are the definition and which letters to scramble.";

/** Shown under “What is it?” on the homophone builder — how homophone clues work. */
export const HOMOPHONE_INTRO =
  "A homophone clue uses two words that sound the same but are spelled differently. " +
  "One side is the definition of the answer; the other is a sound-alike word, marked by a " +
  "sound indicator such as “we hear”, “reportedly”, or “on the radio”, so you know which side is which.";

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
