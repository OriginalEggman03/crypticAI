import { normalizeHomophoneSpelling } from "./homophone-spelling";

/**
 * Block derogatory, explicit, or offensive homophone lexicon entries.
 * Prefer removing the slur/explicit spelling entirely so it cannot be answer or fodder.
 */

/** Words never allowed as homophone answer or fodder. */
const BLOCKED_HOMOPHONE_WORDS = new Set([
  // Identity / group slurs
  "dyke",
  "fag",
  "faggot",
  "faggots",
  "homo",
  "lesbo",
  "tranny",
  "shemale",
  "nigger",
  "nigga",
  "coon",
  "spic",
  "chink",
  "paki",
  "kike",
  "gook",
  "wop",
  "retard",
  "retarded",
  "spaz",
  "spastic",
  // Explicit / sexual
  "cock",
  "cocks",
  "cunt",
  "twat",
  "prick",
  "dick",
  "pussy",
  "tits",
  "boob",
  "boobs",
  "whore",
  "slut",
  "slag",
  "skank",
  "wank",
  "wanker",
  "bollocks",
  "bollock",
  "asshole",
  "arsehole",
  "fuck",
  "fucker",
  "fucking",
  "shit",
  "piss",
  // Milder swears still unsuitable as puzzle surface
  "damn",
  "damned",
  "crappy",
]);

/** Dictionary sense labels that mark a gloss as unsuitable for clues. */
const OFFENSIVE_DEFINITION_RE =
  /\((?:usually |chiefly |somewhat |often )?(?:derogatory|offensive|vulgar|obscene|slur|pejorative|taboo)\b/i;

const OFFENSIVE_DEFINITION_PROSE_RE =
  /\b(?:ethnic|racial)\s+slur\b|\bderogatory\s+(?:term|name|word|label)\b|\boffensive\s+(?:term|name|word|slur)\b/i;

export function isBlockedHomophoneWord(word: string): boolean {
  const normalized = normalizeHomophoneSpelling(word);
  return Boolean(normalized && BLOCKED_HOMOPHONE_WORDS.has(normalized));
}

export function hasOffensiveHomophoneDefinition(definition: string): boolean {
  const text = definition.trim();
  if (!text) return false;
  return (
    OFFENSIVE_DEFINITION_RE.test(text) || OFFENSIVE_DEFINITION_PROSE_RE.test(text)
  );
}

/** True when both spellings and optional stored definitions are safe for the product. */
export function isContentSafeHomophonePair(
  wordA: string,
  wordB: string,
  definitionA?: string,
  definitionB?: string
): boolean {
  if (isBlockedHomophoneWord(wordA) || isBlockedHomophoneWord(wordB)) {
    return false;
  }
  if (definitionA && hasOffensiveHomophoneDefinition(definitionA)) {
    return false;
  }
  if (definitionB && hasOffensiveHomophoneDefinition(definitionB)) {
    return false;
  }
  return true;
}
