/**
 * Definition seed registry — one place to add domains, keywords, and phrases.
 *
 * How to extend:
 * 1. Add or extend a domain entry (pattern + seeds).
 * 2. Add subTopics when a domain has distinct flavours (tennis vs cycling).
 * 3. Add a matching phrase to SEED_BACKED_INSPIRATION_THEMES in definition-quality.ts
 *    if the theme should be eligible for blank-inspiration fallback.
 */

export type ThemeDomain =
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
  | "science"
  | "mythology"
  | "fantasy-fiction"
  | "animals-nature"
  | "history"
  | "games-puzzle"
  | "animation"
  | "transport"
  | "weather";

export interface SubTopicSeeds {
  id: string;
  pattern: RegExp;
  seeds: string[];
}

export interface DomainDefinition {
  id: ThemeDomain;
  /** Higher = listed first when multiple domains match. */
  priority: number;
  pattern: RegExp;
  seeds: string[];
  subTopics?: SubTopicSeeds[];
}

export const DOMAIN_REGISTRY: DomainDefinition[] = [
  {
    id: "fighting-game",
    priority: 12,
    pattern:
      /\b(kombat|fighter|fighters|arcade|brawler|brawlers|tekken|street fighter|mortal kombat|gaming|video game|game character|playable|nintendo|pokémon|pokemon)\b/i,
    seeds: [
      "An arcade combatant",
      "A tournament entrant",
      "A console pugilist",
      "A one-on-one battler",
      "A combat-game favourite",
      "A digital brawler",
      "A playable warrior",
      "A boss-battle foe",
    ],
    subTopics: [
      {
        id: "pokemon",
        pattern: /\b(pokémon|pokemon|trainer|trainers)\b/i,
        seeds: [
          "A pocket monster",
          "A creature from the dex",
          "A trainer's companion",
          "A battle-ready critter",
        ],
      },
    ],
  },
  {
    id: "games-puzzle",
    priority: 10,
    pattern:
      /\b(chess|board game|board games|card game|card games|puzzle|scrabble|monopoly|backgammon|mahjong|crossword)\b/i,
    seeds: [
      "A board-game piece",
      "A gambit perhaps",
      "A player's opening",
      "A tabletop classic",
      "A card-table regular",
      "A checkmating threat",
    ],
    subTopics: [
      {
        id: "chess",
        pattern: /\bchess\b/i,
        seeds: [
          "A chess opening",
          "A grandmaster's gambit",
          "A piece on the board",
          "A mating-pattern name",
        ],
      },
    ],
  },
  {
    id: "spy-fiction",
    priority: 12,
    pattern:
      /\b(bond|007|spy|spies|spymaster|mi6|secret agent|cia|kgb|espionage|double[- ]agent)\b/i,
    seeds: [
      "A spymaster's adversary",
      "A silver-screen antagonist",
      "A cinematic arch-villain",
      "A foe of the secret service",
      "An operative's nemesis",
      "A gadget-laden villain",
      "An intelligence asset",
    ],
  },
  {
    id: "detective-fiction",
    priority: 12,
    pattern:
      /\b(sherlock|holmes|watson|detective|detectives|conan|baker street|scotland yard|lestrade|moriarty|christie|poirot|marple|whodunit|mystery novel)\b/i,
    seeds: [
      "A consulting detective's ally",
      "A casebook regular",
      "A Baker Street associate",
      "A Scotland Yard foil",
      "A mystery's mastermind",
      "A sleuth's quarry",
      "A clue-chasing suspect",
    ],
    subTopics: [
      {
        id: "christie",
        pattern: /\b(christie|poirot|marple|agatha)\b/i,
        seeds: [
          "A Christie suspect",
          "A country-house guest",
          "A drawing-room killer",
          "A moustached investigator's quarry",
        ],
      },
    ],
  },
  {
    id: "food-drink",
    priority: 11,
    pattern:
      /\b(food|drink|tea|teas|coffee|wine|beer|cheese|fruit|vegetable|herb|herbal|spice|carob|cocoa|meal|recipe|cuisine|kitchen|infusion|infusions|beverage|café|cafe|baking|pastry|ingredient)\b/i,
    seeds: [
      "A pantry staple",
      "Something for the larder",
      "A grocer's shelf item",
      "An infusion for the teapot",
      "A dairy counter classic",
      "A brewer's offering",
      "Something steepable",
      "A health-food infusion",
      "A chef's ingredient",
      "A market-stall find",
    ],
    subTopics: [
      {
        id: "tea",
        pattern: /\b(tea|teas|herbal|infusion|tisane|teapot)\b/i,
        seeds: [
          "A herbal infusion",
          "A tisane for the pot",
          "A steepable leaf",
          "A teatime offering",
        ],
      },
      {
        id: "wine-beer",
        pattern: /\b(wine|beer|brewer|brewery|ale|lager|vineyard)\b/i,
        seeds: [
          "A cellar vintage",
          "A pub order",
          "A vineyard export",
          "A brewer's flagship",
        ],
      },
      {
        id: "french-cuisine",
        pattern: /\b(french cuisine|french food|bistro|patisserie|haute cuisine)\b/i,
        seeds: [
          "A bistro speciality",
          "A patisserie treat",
          "A classic French dish",
          "A menu du jour item",
        ],
      },
    ],
  },
  {
    id: "sport",
    priority: 11,
    pattern:
      /\b(wimbledon|tennis|football|cricket|rugby|golf|olympic|olympics|sport|sports|champion|athlete|cup final|premier league|cycling|cyclist|cyclists|bicycle|velodrome|peloton|tour de france|grand tour|marathon|boxing|formula one|f1)\b/i,
    seeds: [
      "A trophy holder",
      "A stadium hero",
      "A medal-winning athlete",
      "A sporting title holder",
      "A finals-day competitor",
      "A record-breaking sportsperson",
    ],
    subTopics: [
      {
        id: "tennis",
        pattern: /\b(wimbledon|tennis|grass court|grand slam)\b/i,
        seeds: [
          "A grass-court victor",
          "A singles champion",
          "A baseline strategist",
          "A Centre Court contender",
        ],
      },
      {
        id: "cycling",
        pattern:
          /\b(cycling|cyclist|cyclists|bicycle|velodrome|peloton|tour de france|grand tour|yellow jersey)\b/i,
        seeds: [
          "A peloton leader",
          "A stage winner",
          "A Grand Tour climber",
          "A yellow-jersey wearer",
          "A breakaway specialist",
        ],
      },
      {
        id: "football",
        pattern: /\b(football|premier league|cup final|soccer|striker|goalkeeper)\b/i,
        seeds: [
          "A Premier League star",
          "A cup-final hero",
          "A penalty-box predator",
          "A midfield maestro",
        ],
      },
      {
        id: "cricket",
        pattern: /\b(cricket|wicket|test match|ashes)\b/i,
        seeds: [
          "A Test-match batter",
          "A wicket-taking bowler",
          "An Ashes protagonist",
          "A slip-cordon fielder",
        ],
      },
      {
        id: "olympics",
        pattern: /\b(olympic|olympics|medal|paralympic)\b/i,
        seeds: [
          "An Olympic medallist",
          "A podium finisher",
          "A torch-bearing athlete",
          "A Games record holder",
        ],
      },
    ],
  },
  {
    id: "animation",
    priority: 11,
    pattern:
      /\b(ghibli|pixar|disney|animated|animation|cartoon|cartoons|anime)\b/i,
    seeds: [
      "An animated hero",
      "A cartoon favourite",
      "A cel-painted character",
      "A storyboard star",
      "A family-film figure",
    ],
    subTopics: [
      {
        id: "ghibli",
        pattern: /\b(ghibli|totoro|spirited away)\b/i,
        seeds: [
          "A Ghibli protagonist",
          "A hand-drawn wanderer",
          "A forest spirit perhaps",
        ],
      },
      {
        id: "pixar",
        pattern: /\b(pixar|toy story|finding nemo)\b/i,
        seeds: [
          "A Pixar sidekick",
          "A computer-animated lead",
          "A sequel's returning face",
        ],
      },
    ],
  },
  {
    id: "film-tv",
    priority: 8,
    pattern:
      /\b(film|films|movie|movies|cinema|television|tv series|actor|actress|hollywood|marvel|avengers|star wars|doctor who|broadway|screen|blockbuster|superhero)\b/i,
    seeds: [
      "A screen legend",
      "A celluloid star",
      "A box-office draw",
      "A television fixture",
      "A Hollywood player",
      "A franchise regular",
      "A marquee name",
    ],
    subTopics: [
      {
        id: "marvel",
        pattern: /\b(marvel|avengers|superhero|iron man|spider[- ]man)\b/i,
        seeds: [
          "A costumed Avenger",
          "A comic-book transplant",
          "A MCU headline act",
        ],
      },
      {
        id: "doctor-who",
        pattern: /\b(doctor who|tardis|companion|dalek|time lord)\b/i,
        seeds: [
          "A Time Lord ally",
          "A TARDIS traveller",
          "A recurring companion",
        ],
      },
      {
        id: "broadway",
        pattern: /\b(broadway|musical theatre|west end)\b/i,
        seeds: [
          "A Broadway lead",
          "A curtain-call star",
          "A show-stopping role",
        ],
      },
    ],
  },
  {
    id: "sitcom",
    priority: 10,
    pattern:
      /\b(fawlty|blackadder|comedy series|british comedy|office farce|sitcom|sitcoms)\b/i,
    seeds: [
      "A sitcom fixture",
      "A comic landlord",
      "A small-screen schemer",
      "A farcical host",
      "A guest from the sitcom canon",
      "A laugh-track regular",
    ],
  },
  {
    id: "literature",
    priority: 10,
    pattern:
      /\b(book|books|novel|novels|author|authors|poet|poetry|literature|playwright|shakespeare|potter|tolkien|rowling)\b/i,
    seeds: [
      "A literary creation",
      "A novel's central figure",
      "A page-turner's subject",
      "A bookshelf regular",
      "A canon character",
      "A chapter's focus",
    ],
    subTopics: [
      {
        id: "shakespeare",
        pattern: /\b(shakespeare|hamlet|macbeth|othello|lear)\b/i,
        seeds: [
          "A Shakespearean role",
          "A Globe player",
          "A tragic stage figure",
        ],
      },
      {
        id: "fantasy-lit",
        pattern: /\b(potter|hogwarts|tolkien|hobbit|middle[- ]earth|fantasy novel)\b/i,
        seeds: [
          "A wand-wielding student",
          "A questing adventurer",
          "A fantasy-world regular",
        ],
      },
    ],
  },
  {
    id: "fantasy-fiction",
    priority: 11,
    pattern:
      /\b(harry potter|hogwarts|wizard|wizards|witch|magic|spell|spells|middle[- ]earth|hobbit|lord of the rings|fantasy|enchanted)\b/i,
    seeds: [
      "A spell from the curriculum",
      "A wand-wielding pupil",
      "A magical artefact",
      "A fantasy-realm denizen",
      "An enchanted being",
    ],
  },
  {
    id: "mythology",
    priority: 11,
    pattern:
      /\b(myth|myths|mythology|greek god|greek gods|norse|viking|egyptian|pharaoh|pharaohs|olympian|pantheon|zeus|thor|odin)\b/i,
    seeds: [
      "A figure from myth",
      "A pantheon member",
      "An epic's protagonist",
      "A legendary demigod",
      "A saga's immortal",
      "A temple honoured name",
    ],
    subTopics: [
      {
        id: "greek",
        pattern: /\b(greek|greek mythology|olympian|zeus|athena|homer|trojan|odyssey|mythology heroes)\b/i,
        seeds: [
          "An Olympian deity",
          "A Trojan War figure",
          "A classical hero",
        ],
      },
      {
        id: "norse",
        pattern: /\b(norse|viking|thor|odin|asgard|saga)\b/i,
        seeds: [
          "A Norse deity",
          "A saga warrior",
          "A Valhalla candidate",
        ],
      },
      {
        id: "egyptian",
        pattern: /\b(egyptian|pharaoh|pyramid|nile|cleopatra)\b/i,
        seeds: [
          "A pharaoh's name",
          "A tomb inscription",
          "A Nile dynasty figure",
        ],
      },
    ],
  },
  {
    id: "history",
    priority: 10,
    pattern:
      /\b(medieval|knight|knights|castle|castles|roman|empire|victorian|ancient|renaissance|monarch|king|queen|dynasty|pirate|pirates)\b/i,
    seeds: [
      "A historical figure",
      "A chronicle's subject",
      "A crown-wearing name",
      "A battle-scarred veteran",
      "A dynasty's notable",
    ],
    subTopics: [
      {
        id: "medieval",
        pattern: /\b(medieval|knight|knights|castle|joust|round table)\b/i,
        seeds: [
          "An armoured knight",
          "A castle dweller",
          "A Round Table knight",
        ],
      },
      {
        id: "pirates",
        pattern: /\b(pirate|pirates|buccaneer|caribbean|privateer)\b/i,
        seeds: [
          "A buccaneer captain",
          "A Jolly Roger name",
          "A Caribbean raider",
        ],
      },
    ],
  },
  {
    id: "animals-nature",
    priority: 10,
    pattern:
      /\b(animal|animals|bird|birds|wildlife|pet|pets|dog|dogs|cat|cats|garden|gardening|botany|flower|flowers|plant|plants|nature|zoo|insect|butterfly)\b/i,
    seeds: [
      "A garden visitor",
      "A feathered resident",
      "A woodland creature",
      "A nature-guide entry",
      "A pet-shop find",
      "A bloom in the border",
    ],
    subTopics: [
      {
        id: "birds",
        pattern: /\b(bird|birds|ornithology|robin|sparrow|garden bird)\b/i,
        seeds: [
          "A British garden bird",
          "A feathered songster",
          "A twitcher's tick",
        ],
      },
      {
        id: "pets",
        pattern: /\b(pet|pets|dog|dogs|cat|cats|puppy|kitten)\b/i,
        seeds: [
          "A household pet",
          "A kennel-club breed",
          "A faithful companion",
        ],
      },
      {
        id: "botany",
        pattern: /\b(botany|flower|flowers|plant|plants|garden|shrub|tree)\b/i,
        seeds: [
          "A garden perennial",
          "A florist's offering",
          "A botanical specimen",
        ],
      },
    ],
  },
  {
    id: "music",
    priority: 10,
    pattern:
      /\b(song|songs|music|musical|band|bands|singer|singers|album|composer|composers|opera|jazz|rock|blues|orchestra|concert)\b/i,
    seeds: [
      "A chart-topping name",
      "A lyricist's subject",
      "A band's front person",
      "A concert-hall draw",
      "A discography entry",
      "A headline act",
    ],
    subTopics: [
      {
        id: "jazz",
        pattern: /\bjazz\b/i,
        seeds: [
          "A jazz standard",
          "A smoky-club legend",
          "A improvisation virtuoso",
        ],
      },
      {
        id: "rock",
        pattern: /\b(rock|rock and roll|hall of fame|guitar)\b/i,
        seeds: [
          "A rock-and-roll icon",
          "A stadium-tour veteran",
          "A hall-of-fame inductee",
        ],
      },
      {
        id: "classical",
        pattern: /\b(opera|composer|symphony|orchestra|classical)\b/i,
        seeds: [
          "An operatic role",
          "A composer's namesake",
          "A symphony dedicatee",
        ],
      },
    ],
  },
  {
    id: "geography",
    priority: 9,
    pattern:
      /\b(country|countries|counties|city|cities|capital|capitals|river|rivers|mountain|mountains|continent|island|islands|county|borough|landmark|landmarks|london|paris|europe)\b/i,
    seeds: [
      "A cartographer's label",
      "A traveller's destination",
      "A capital perhaps",
      "A map-room entry",
      "A guidebook highlight",
      "An atlas index item",
    ],
    subTopics: [
      {
        id: "london",
        pattern: /\b(london|borough|thames|westminster)\b/i,
        seeds: [
          "A London landmark",
          "A Thames-side district",
          "A capital postcode",
        ],
      },
    ],
  },
  {
    id: "science",
    priority: 10,
    pattern:
      /\b(science|scientist|scientists|physics|chemistry|biology|element|elements|planet|planets|astronomy|mathematician|space|laboratory|periodic table|nasa)\b/i,
    seeds: [
      "A laboratory discovery",
      "A textbook entry",
      "A boffin's eponym",
      "A periodic-table name",
      "A peer-reviewed breakthrough",
      "A Nobel laureate's namesake",
    ],
    subTopics: [
      {
        id: "space",
        pattern: /\b(space|nasa|astronaut|rocket|planet|galaxy|orbit)\b/i,
        seeds: [
          "A planetary body",
          "A mission codename",
          "An astronomer's target",
        ],
      },
      {
        id: "chemistry",
        pattern: /\b(chemistry|element|chemical|periodic table|compound)\b/i,
        seeds: [
          "A chemical element",
          "A lab reagent",
          "A Mendeleev slot",
        ],
      },
    ],
  },
  {
    id: "transport",
    priority: 9,
    pattern:
      /\b(car|cars|marque|marques|automobile|motor|motoring|vehicle|vehicles|vintage car|railway|locomotive|aircraft)\b/i,
    seeds: [
      "A motoring classic",
      "A marque from the forecourt",
      "A garage forecourt model",
      "A veteran car name",
      "A showroom badge",
    ],
  },
  {
    id: "weather",
    priority: 9,
    pattern:
      /\b(weather|season|seasons|climate|storm|storms|rain|snow|frost|meteorology|forecast|hurricane|thunder)\b/i,
    seeds: [
      "A meteorological phenomenon",
      "A seasonal condition",
      "A forecaster's term",
      "A climate pattern",
      "A sky-watcher's report",
    ],
  },
];

const DOMAIN_BY_ID = new Map(DOMAIN_REGISTRY.map((d) => [d.id, d]));

interface DomainHit {
  id: ThemeDomain;
  score: number;
}

function scoreDomain(domain: DomainDefinition, lower: string): number | null {
  if (!domain.pattern.test(lower)) return null;

  let score = domain.priority;
  for (const sub of domain.subTopics ?? []) {
    if (sub.pattern.test(lower)) score += 12;
  }
  return score;
}

/** Domains that match the inspiration, best fit first. */
export function rankThemeDomains(inspiration: string): ThemeDomain[] {
  const lower = inspiration.toLowerCase();
  const hits: DomainHit[] = [];

  for (const domain of DOMAIN_REGISTRY) {
    const score = scoreDomain(domain, lower);
    if (score !== null) hits.push({ id: domain.id, score });
  }

  if (
    hits.length === 0 &&
    /\b(character|characters|hero|heroes|villain|villains|name|names)\b/i.test(
      lower
    )
  ) {
    hits.push({ id: "film-tv", score: 1 });
  }

  hits.sort((a, b) => b.score - a.score);
  const seen = new Set<ThemeDomain>();
  const ordered: ThemeDomain[] = [];
  for (const hit of hits) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    ordered.push(hit.id);
  }
  return ordered;
}

/** Alias for diagnostics. */
export function listThemeDomains(inspiration: string): ThemeDomain[] {
  return rankThemeDomains(inspiration);
}

function seedAllowed(seed: string, answerLower: string): boolean {
  if (!answerLower) return true;
  const key = seed.toLowerCase();
  if (key.includes(answerLower)) return false;
  const answerTokens = answerLower.split(/\s+/).filter((t) => t.length >= 4);
  return !answerTokens.some((token) => key.includes(token));
}

/** Drop seeds that would leak the answer on the definition side. */
export function filterSeedsForAnswer(seeds: string[], answer: string): string[] {
  const answerLower = answer.toLowerCase().replace(/\s+/g, " ").trim();
  return seeds.filter((seed) => seedAllowed(seed, answerLower));
}

export function mergeDefinitionSeedLists(
  primary: string[],
  supplemental: string[]
): string[] {
  const seen = new Set(primary.map((seed) => seed.toLowerCase()));
  const merged = [...primary];
  for (const seed of supplemental) {
    const key = seed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(seed);
  }
  return merged;
}

/**
 * Collect definition seeds: sub-topic phrases first (most accurate), then
 * domain phrases in rank order.
 */
export function collectDefinitionSeeds(
  inspiration: string,
  answer: string
): string[] {
  const lower = inspiration.toLowerCase();
  const answerLower = answer.toLowerCase().replace(/\s+/g, " ").trim();
  const seen = new Set<string>();
  const phrases: string[] = [];

  const add = (seed: string) => {
    const key = seed.toLowerCase();
    if (seen.has(key)) return;
    if (!seedAllowed(seed, answerLower)) return;
    seen.add(key);
    phrases.push(seed);
  };

  for (const domain of DOMAIN_REGISTRY) {
    for (const sub of domain.subTopics ?? []) {
      if (!sub.pattern.test(lower)) continue;
      for (const seed of sub.seeds) add(seed);
    }
  }

  for (const domainId of rankThemeDomains(inspiration)) {
    const domain = DOMAIN_BY_ID.get(domainId);
    if (!domain) continue;
    for (const seed of domain.seeds) add(seed);
  }

  return phrases;
}
