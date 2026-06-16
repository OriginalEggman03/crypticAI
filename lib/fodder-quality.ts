import { isDictionaryWord } from "./inspiration-parse";
import {
  fodderProperNameIssue,
  hasBannedNameFodder,
} from "./fodder-names";
import { fodderHasContractionFragment, isContractionFragment } from "./fodder-contractions";

/** High-frequency words that read naturally in clue surfaces. */
const COMMON_WORDS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "of", "for", "by",
  "with", "from", "into", "over", "under", "about", "after", "before",
  "one", "two", "new", "old", "big", "bad", "red", "hot", "cold", "long",
  "man", "men", "boy", "girl", "son", "dad", "mum", "king", "queen", "lord",
  "lady", "friend", "people", "person", "child", "woman", "women",
  "day", "night", "time", "year", "life", "world", "place", "home", "house",
  "room", "door", "road", "street", "town", "city", "land", "sea", "air",
  "water", "fire", "food", "wine", "beer", "tea", "bread", "meat", "fish",
  "dog", "cat", "bird", "horse", "tree", "flower", "garden", "field",
  "work", "play", "run", "walk", "read", "write", "sing", "dance", "enjoy",
  "love", "hate", "hope", "fear", "think", "know", "see", "look", "find",
  "make", "take", "give", "come", "go", "get", "put", "set", "let", "say",
  "tell", "ask", "call", "keep", "hold", "turn", "move", "break", "build",
  "good", "great", "fine", "fair", "poor", "rich", "free", "true", "real",
  "near", "far", "high", "low", "left", "right", "open", "close", "full",
  "empty", "clean", "dark", "light", "hard", "soft", "fast", "slow",
  "story", "book", "film", "game", "song", "music", "art", "show", "play",
  "john", "jane", "mary", "paul", "mark", "james", "david", "peter", "anne",
  "joy", "hope", "grace", "rose", "june", "april", "may",
  "north", "south", "east", "west", "gold", "silver", "iron", "stone",
  "wind", "rain", "snow", "sun", "moon", "star", "cloud", "storm",
  "car", "train", "ship", "boat", "plane", "road", "bridge", "port",
  "war", "peace", "law", "rule", "power", "force", "order", "change",
  "idea", "plan", "part", "whole", "kind", "sort", "type", "form", "way",
  "end", "start", "line", "point", "side", "back", "front", "head", "hand",
  "foot", "arm", "leg", "eye", "ear", "face", "heart", "mind", "soul",
  "agency", "cage", "near", "dear", "read", "lead", "deal", "meal", "real",
  "ideal", "royal", "loyal", "moral", "local", "vocal", "total", "metal",
]);

/** Words that are dictionary-valid but read poorly as clue fodder. */
const AWKWARD_FODDER_WORDS = new Set([
  "cipro", "gnu", "ira", "iraq", "chg", "nra", "ind", "nae", "tia", "nat",
  "ant", "iso", "corp", "ion", "orb", "rob", "bro", "orb", "gui", "lug",
  "ink", "gaul", "klan",
]);

const MIN_PHRASE_GRAMMAR_SCORE = 45;
const MIN_SINGLE_GRAMMAR_SCORE = 25;

function fodderTokens(fodder: string): string[] {
  return fodder
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z]/g, ""))
    .filter(Boolean);
}

/** Every fodder token must be a dictionary word. */
export function isDictionaryFodder(fodder: string): boolean {
  const tokens = fodderTokens(fodder);
  if (tokens.length === 0) return false;
  return tokens.every((t) => isDictionaryWord(t));
}

function scoreFodderWord(word: string): number {
  let score = 30;

  if (isContractionFragment(word)) score -= 80;
  if (COMMON_WORDS.has(word)) score += 40;
  if (AWKWARD_FODDER_WORDS.has(word)) score -= 45;
  if (word.length >= 4 && word.length <= 7) score += 10;
  if (word.length === 3 && !COMMON_WORDS.has(word)) score -= 15;
  if (word.length > 8) score -= 10;

  return score;
}

/** Higher = more likely to read naturally when embedded in a clue sentence. */
export function scoreFodderGrammaticality(fodder: string): number {
  const tokens = fodderTokens(fodder);
  if (tokens.length === 0) return 0;
  if (!isDictionaryFodder(fodder)) return 0;

  if (tokens.length === 1) {
    return scoreFodderWord(tokens[0]);
  }

  const wordScores = tokens.map(scoreFodderWord);
  const avg = wordScores.reduce((a, b) => a + b, 0) / wordScores.length;
  let score = avg;

  const commonCount = tokens.filter((t) => COMMON_WORDS.has(t)).length;
  score += commonCount * 8;

  if (tokens.length === 2 && commonCount >= 1) score += 12;
  if (wordScores.some((s) => s < 25)) score -= 25;
  if (tokens.every((t) => !COMMON_WORDS.has(t) && t.length <= 4)) score -= 20;

  return Math.round(score);
}

export function isGrammaticalDictionaryFodder(fodder: string): boolean {
  if (!isDictionaryFodder(fodder)) return false;
  if (hasBannedNameFodder(fodder)) return false;
  if (fodderHasContractionFragment(fodder)) return false;
  const tokens = fodderTokens(fodder);
  const score = scoreFodderGrammaticality(fodder);
  const min =
    tokens.length === 1 ? MIN_SINGLE_GRAMMAR_SCORE : MIN_PHRASE_GRAMMAR_SCORE;
  return score >= min;
}

export { fodderProperNameIssue, hasBannedNameFodder };

export function rankFodderCandidates(fodders: string[]): string[] {
  return [...fodders]
    .filter(isGrammaticalDictionaryFodder)
    .sort(
      (a, b) => scoreFodderGrammaticality(b) - scoreFodderGrammaticality(a)
    );
}
