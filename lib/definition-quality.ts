import { shuffleWithSeed } from "./anagram-indicators";
import {
  collectDefinitionSeeds,
  filterSeedsForAnswer,
  listThemeDomains,
  mergeDefinitionSeedLists,
  rankThemeDomains,
  type ThemeDomain,
} from "./definition-domains";

export type { ThemeDomain };
export { listThemeDomains, rankThemeDomains };
export const VAGUE_DEFINITION_PATTERNS: RegExp[] = [
  /^a (named|notable|familiar|well[- ]known|pop[- ]?culture) (figure|name|face)\b/i,
  /^one (possibility|from the (canon|roster))\b/i,
  /^a roster member\b/i,
  /^a (series )?regular\b/i,
  /^a digital icon\b/i,
  /^something on the menu\b/i,
  /^a tasty option\b/i,
  /^a well[- ]known name\b/i,
  /^a pop[- ]?culture name\b/i,
  /^one from the (canon|roster)\b/i,
  /^a fighter perhaps\b/i,
  /^a familiar face\b/i,
];

export const DEFINITION_THEME_CRAFT_RULE = `The definition must anchor the answer in the inspiration's world so a solver who does NOT know the setter's theme phrase can still grasp the domain — e.g. "A health-food infusion" for herbal teas, "A grass-court champion" for Wimbledon, "A spymaster's adversary" for Bond villains, "An arcade combatant" for fighting-game characters. FORBIDDEN vague fillers: "A named figure", "A familiar name", "A notable figure", "One possibility", "A roster member", "A well-known name", and similar placeholders that could fit any theme.`;

function normalizeDefinitionForCheck(definition: string): string {
  const trimmed = definition.trim();
  if (!trimmed) return trimmed;
  if (/^a(n)?\s/i.test(trimmed)) return trimmed;
  return `a ${trimmed}`;
}

export function isVagueDefinition(definition: string): boolean {
  const trimmed = definition.trim();
  if (!trimmed) return true;

  const candidates = [trimmed, normalizeDefinitionForCheck(trimmed)];
  if (VAGUE_DEFINITION_PATTERNS.some((pattern) => candidates.some((c) => pattern.test(c)))) {
    return true;
  }

  if (
    /^(named|notable|familiar|well[- ]known|pop[- ]?culture) (figure|name|face)\b/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (/^roster member\b/i.test(trimmed)) return true;

  return false;
}

export function verifyDefinitionNotVague(definition: string): string | null {
  const trimmed = definition.trim();
  if (!trimmed) {
    return "Definition is missing from the clue surface";
  }
  if (isVagueDefinition(trimmed)) {
    return `Definition "${trimmed}" is too vague — tie it to the inspiration's domain (food, sport, spies, games, etc.) instead of a generic placeholder`;
  }
  return null;
}

/**
 * Inspiration phrases that reliably match domain detectors so programmatic
 * templates get concrete definition seeds. Keep in sync with DOMAIN_REGISTRY.
 */
export const SEED_BACKED_INSPIRATION_THEMES = [
  "Mortal Kombat fighters and characters",
  "James Bond villains and spy gadgets",
  "Sherlock Holmes cases and suspects",
  "Agatha Christie detectives and suspects",
  "Coffee, tea and herbal infusions",
  "French cuisine and ingredients",
  "Tour de France cycling climbs and legends",
  "Wimbledon tennis champions",
  "Premier League football stars",
  "Hollywood film villains and heroes",
  "Marvel Avengers roster",
  "Studio Ghibli animated films",
  "Harry Potter spells and characters",
  "Classic British sitcom characters",
  "Shakespeare plays and characters",
  "Greek mythology heroes and gods",
  "Jazz legends and instruments",
  "European capitals and cities",
  "London landmarks and boroughs",
  "Chemistry elements and famous scientists",
  "Space exploration and planets",
  "British birds and garden wildlife",
  "Medieval knights and castles",
  "Chess openings and pieces",
  "Pokémon types and trainers",
] as const;

/** True when inspiration maps to at least one domain with definition seeds. */
export function inspirationHasDefinitionSeeds(inspiration: string): boolean {
  return listThemeDomains(inspiration).length > 0;
}

/** Pick a theme guaranteed to populate definition seeds (for auto-theme retries). */
export function pickSeedBackedInspiration(
  exclude: string[] = [],
  seed = `${Date.now()}`
): string {
  const excludeLower = new Set(
    exclude.map((phrase) => phrase.trim().toLowerCase()).filter(Boolean)
  );
  const pool = SEED_BACKED_INSPIRATION_THEMES.filter(
    (theme) => !excludeLower.has(theme.toLowerCase())
  );
  const candidates = pool.length > 0 ? pool : [...SEED_BACKED_INSPIRATION_THEMES];
  return shuffleWithSeed(candidates, seed)[0] ?? SEED_BACKED_INSPIRATION_THEMES[0];
}

/** Theme-specific definition seeds for programmatic clue templates. */
export function themeDefinitionSeeds(
  inspiration: string,
  answer: string,
  claudeSeeds: string[] = []
): string[] {
  const registry = collectDefinitionSeeds(inspiration, answer);
  if (claudeSeeds.length === 0) return registry;
  const filtered = filterSeedsForAnswer(claudeSeeds, answer);
  return mergeDefinitionSeedLists(registry, filtered);
}

export function definitionThemeScore(definition: string): number {
  if (isVagueDefinition(definition)) return -40;
  const words = definition.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 4) return 8;
  if (words.length >= 3) return 4;
  return 0;
}
