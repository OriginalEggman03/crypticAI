import { phraseUsesHiddenInspirationWord } from "./inspiration-parse";

/** Definition phrases too vague to stand alone — reject in verification. */
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

type ThemeDomain =
  | "fighting-game"
  | "spy-fiction"
  | "detective-fiction"
  | "food-drink"
  | "sport"
  | "film-tv"
  | "sitcom"
  | "literature"
  | "music"
  | "geography"
  | "science";

const DOMAIN_DEFINITION_SEEDS: Record<ThemeDomain, string[]> = {
  "fighting-game": [
    "An arcade combatant",
    "A tournament entrant",
    "A console pugilist",
    "A one-on-one battler",
    "A combat-game favourite",
    "A digital brawler",
  ],
  "spy-fiction": [
    "A spymaster's adversary",
    "A silver-screen antagonist",
    "A cinematic arch-villain",
    "A foe of the secret service",
    "An operative's nemesis",
  ],
  "detective-fiction": [
    "A consulting detective's ally",
    "A casebook regular",
    "A Baker Street associate",
    "A Scotland Yard foil",
    "A mystery's mastermind",
    "A sleuth's quarry",
  ],
  "food-drink": [
    "A pantry staple",
    "Something for the larder",
    "A grocer's shelf item",
    "An infusion for the teapot",
    "A dairy counter classic",
    "A brewer's offering",
    "Something steepable",
    "A health-food infusion",
  ],
  sport: [
    "A grass-court victor",
    "A singles champion",
    "A trophy holder",
    "A stadium hero",
    "A medal-winning athlete",
    "A sporting title holder",
  ],
  "film-tv": [
    "A screen legend",
    "A celluloid star",
    "A box-office draw",
    "A television fixture",
    "A Hollywood player",
  ],
  sitcom: [
    "A sitcom fixture",
    "A comic landlord",
    "A small-screen schemer",
    "A farcical host",
    "A guest from the sitcom canon",
  ],
  literature: [
    "A literary creation",
    "A novel's central figure",
    "A page-turner's subject",
    "A bookshelf regular",
  ],
  music: [
    "A chart-topping name",
    "A lyricist's subject",
    "A band's front person",
    "A concert-hall draw",
  ],
  geography: [
    "A cartographer's label",
    "A traveller's destination",
    "A capital perhaps",
    "A map-room entry",
  ],
  science: [
    "A laboratory discovery",
    "A textbook entry",
    "A boffin's eponym",
    "A periodic-table name",
  ],
};

function detectThemeDomains(inspiration: string): ThemeDomain[] {
  const lower = inspiration.toLowerCase();
  const domains = new Set<ThemeDomain>();

  if (
    /\b(kombat|fighter|arcade|brawler|tekken|gaming|video game|game character|playable)\b/i.test(
      lower
    ) ||
    (/\bcharacter|\bhero|\bvillain\b/i.test(lower) && /\bgame\b/i.test(lower))
  ) {
    domains.add("fighting-game");
  }
  if (
    /\b(bond|007|spy|spymaster|mi6|secret agent|cia|kgb)\b/i.test(lower) ||
    (/\bvillain\b/i.test(lower) &&
      /\b(film|movie|cinema|screen)\b/i.test(lower))
  ) {
    domains.add("spy-fiction");
  }
  if (
    /\b(sherlock|holmes|watson|detective|conan|baker street|scotland yard|lestrade|moriarty)\b/i.test(
      lower
    )
  ) {
    domains.add("detective-fiction");
  }
  if (
    /\b(food|drink|tea|teas|coffee|wine|beer|cheese|fruit|vegetable|herb|herbal|spice|carob|cocoa|meal|recipe|cuisine|kitchen|infusion|infusions|beverage)\b/i.test(
      lower
    )
  ) {
    domains.add("food-drink");
  }
  if (
    /\b(wimbledon|tennis|football|cricket|rugby|golf|olympic|sport|champion|athlete|cup final|premier league)\b/i.test(
      lower
    )
  ) {
    domains.add("sport");
  }
  if (/\b(film|movie|cinema|television|tv series|sitcom|actor|actress|hollywood)\b/i.test(lower)) {
    domains.add("film-tv");
  }
  if (
    /\b(fawlty|blackadder|comedy series|british comedy|office farce)\b/i.test(
      lower
    ) ||
    /\bsitcom\b/i.test(lower)
  ) {
    domains.add("sitcom");
  }
  if (/\b(book|novel|author|poet|literature|playwright|shakespeare)\b/i.test(lower)) {
    domains.add("literature");
  }
  if (/\b(song|music|band|singer|album|composer|opera)\b/i.test(lower)) {
    domains.add("music");
  }
  if (
    /\b(country|counties|city|cities|capital|river|mountain|continent|island|county)\b/i.test(
      lower
    )
  ) {
    domains.add("geography");
  }
  if (
    /\b(science|scientist|physics|chemistry|biology|element|planet|astronomy|mathematician)\b/i.test(
      lower
    )
  ) {
    domains.add("science");
  }

  if (domains.size === 0 && /\bcharacter|\bhero|\bvillain|\bname\b/i.test(lower)) {
    domains.add("film-tv");
  }

  return [...domains];
}

/** Theme-specific definition seeds for programmatic clue templates. */
export function themeDefinitionSeeds(
  inspiration: string,
  answer: string
): string[] {
  const answerLower = answer.toLowerCase().replace(/\s+/g, " ");
  const seen = new Set<string>();
  const phrases: string[] = [];

  for (const domain of detectThemeDomains(inspiration)) {
    for (const seed of DOMAIN_DEFINITION_SEEDS[domain]) {
      const key = seed.toLowerCase();
      if (seen.has(key)) continue;
      if (key.includes(answerLower)) continue;
      if (phraseUsesHiddenInspirationWord(seed, inspiration)) continue;
      seen.add(key);
      phrases.push(seed);
    }
  }

  return phrases;
}

export function definitionThemeScore(definition: string): number {
  if (isVagueDefinition(definition)) return -40;
  const words = definition.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 4) return 8;
  if (words.length >= 3) return 4;
  return 0;
}
