import {
  extractHomophoneIndicatorFromClue,
  HOMOPHONE_HOT_INDICATOR_THRESHOLD,
  HOMOPHONE_INDICATORS,
  isOverusedHomophoneIndicator,
  normalizeHomophoneIndicatorKey,
  pickHomophoneIndicatorPhrases,
} from "./homophone-indicators";
import { shuffleWithSeed } from "./anagram-indicators";
import { archivedHomophoneClues } from "./generation-exclude";

export type HomophoneIndicatorTheme =
  | "speech"
  | "broadcast"
  | "auditory"
  | "oral"
  | "reading"
  | "performance";

export interface ThemedHomophoneIndicator {
  phrase: string;
  themes: HomophoneIndicatorTheme[];
}

/** Homophone indicators grouped by thematic tone for Claude selection. */
export const THEMED_HOMOPHONE_INDICATORS: ThemedHomophoneIndicator[] = [
  // Hearing & auditory
  { phrase: "according to hearsay", themes: ["auditory", "broadcast"] },
  { phrase: "as heard", themes: ["auditory"] },
  { phrase: "at hearing", themes: ["auditory"] },
  { phrase: "audible", themes: ["auditory"] },
  { phrase: "audibly", themes: ["auditory"] },
  { phrase: "by the sound of it", themes: ["auditory"] },
  { phrase: "for those in earshot", themes: ["auditory"] },
  { phrase: "for those in hearing", themes: ["auditory"] },
  { phrase: "heard", themes: ["auditory"] },
  { phrase: "in earshot", themes: ["auditory"] },
  { phrase: "it sounds", themes: ["auditory"] },
  { phrase: "listening", themes: ["auditory"] },
  { phrase: "listened to", themes: ["auditory"] },
  { phrase: "one hears", themes: ["auditory"] },
  { phrase: "overheard", themes: ["auditory"] },
  { phrase: "perceived as", themes: ["auditory", "speech"] },
  { phrase: "picked up", themes: ["auditory", "broadcast"] },
  { phrase: "so we hear", themes: ["auditory"] },
  { phrase: "sound of", themes: ["auditory"] },
  { phrase: "sounded", themes: ["auditory"] },
  { phrase: "sounding", themes: ["auditory"] },
  { phrase: "sounds", themes: ["auditory"] },
  { phrase: "sounds like", themes: ["auditory"] },
  { phrase: "to hear", themes: ["auditory"] },
  { phrase: "to the ear", themes: ["auditory"] },
  { phrase: "we hear", themes: ["auditory"] },
  // Speech & oral
  { phrase: "aloud", themes: ["oral"] },
  { phrase: "announced", themes: ["speech", "performance"] },
  { phrase: "articulated", themes: ["speech"] },
  { phrase: "as spoken", themes: ["oral", "speech"] },
  { phrase: "as stated", themes: ["speech"] },
  { phrase: "comes across as", themes: ["speech", "auditory"] },
  { phrase: "coming across as", themes: ["speech", "auditory"] },
  { phrase: "declared", themes: ["speech", "performance"] },
  { phrase: "declaimed", themes: ["speech", "performance"] },
  { phrase: "enunciated", themes: ["speech", "oral"] },
  { phrase: "in conversation", themes: ["speech", "oral"] },
  { phrase: "in speech", themes: ["oral", "speech"] },
  { phrase: "mentioned", themes: ["speech"] },
  { phrase: "oral", themes: ["oral"] },
  { phrase: "orally", themes: ["oral"] },
  { phrase: "or so it's said", themes: ["speech", "auditory"] },
  { phrase: "or so we hear", themes: ["speech", "auditory"] },
  { phrase: "out loud", themes: ["oral"] },
  { phrase: "outspoken", themes: ["speech", "oral"] },
  { phrase: "phonetically", themes: ["oral", "speech"] },
  { phrase: "pronounced", themes: ["speech", "oral"] },
  { phrase: "say", themes: ["speech"] },
  { phrase: "said", themes: ["speech"] },
  { phrase: "so it's said", themes: ["speech"] },
  { phrase: "so we're told", themes: ["speech", "broadcast"] },
  { phrase: "speaking", themes: ["speech"] },
  { phrase: "spoken", themes: ["speech", "oral"] },
  { phrase: "stated", themes: ["speech"] },
  { phrase: "told", themes: ["speech"] },
  { phrase: "uttered", themes: ["speech"] },
  { phrase: "verbal", themes: ["oral", "speech"] },
  { phrase: "verbally", themes: ["oral", "speech"] },
  { phrase: "viva voce", themes: ["oral", "speech"] },
  { phrase: "vocal", themes: ["speech"] },
  { phrase: "voiced", themes: ["speech"] },
  { phrase: "voice of", themes: ["speech", "auditory"] },
  { phrase: "when spoken", themes: ["oral", "speech"] },
  // Broadcast & reporting
  { phrase: "aired", themes: ["broadcast"] },
  { phrase: "broadcast", themes: ["broadcast"] },
  { phrase: "for audience", themes: ["broadcast", "auditory"] },
  { phrase: "for auditors", themes: ["auditory", "broadcast"] },
  { phrase: "for eavesdroppers", themes: ["auditory"] },
  { phrase: "for listener", themes: ["auditory", "broadcast"] },
  { phrase: "from the radio", themes: ["broadcast"] },
  { phrase: "gathered", themes: ["broadcast", "auditory"] },
  { phrase: "in audition", themes: ["auditory", "performance"] },
  { phrase: "in podcast", themes: ["broadcast"] },
  { phrase: "in recording", themes: ["broadcast"] },
  { phrase: "on record", themes: ["broadcast"] },
  { phrase: "in report", themes: ["broadcast"] },
  { phrase: "on air", themes: ["broadcast"] },
  { phrase: "on the air", themes: ["broadcast"] },
  { phrase: "on the airwaves", themes: ["broadcast"] },
  { phrase: "on the phone", themes: ["broadcast"] },
  { phrase: "on the radio", themes: ["broadcast"] },
  { phrase: "on the tele", themes: ["broadcast"] },
  { phrase: "on the telephone", themes: ["broadcast"] },
  { phrase: "on transmission", themes: ["broadcast"] },
  { phrase: "over the air", themes: ["broadcast"] },
  { phrase: "over the airwaves", themes: ["broadcast"] },
  { phrase: "over the phone", themes: ["broadcast"] },
  { phrase: "podcaster's", themes: ["broadcast"] },
  { phrase: "relayed", themes: ["broadcast"] },
  { phrase: "reported", themes: ["broadcast"] },
  { phrase: "reportedly", themes: ["broadcast"] },
  { phrase: "to the audience", themes: ["broadcast", "performance"] },
  { phrase: "transmitted", themes: ["broadcast"] },
  { phrase: "via the radio", themes: ["broadcast"] },
  { phrase: "we gather", themes: ["broadcast", "auditory"] },
  // Reading aloud
  { phrase: "all to hear", themes: ["reading", "auditory"] },
  { phrase: "read aloud", themes: ["reading", "oral"] },
  { phrase: "read out", themes: ["reading", "oral"] },
  { phrase: "when read aloud", themes: ["reading", "oral"] },
  // Performance
  { phrase: "narrated", themes: ["performance", "reading"] },
  { phrase: "recited", themes: ["performance", "reading"] },
  { phrase: "shouted", themes: ["performance", "speech"] },
  { phrase: "spouted", themes: ["performance", "speech"] },
  { phrase: "sung", themes: ["performance"] },
];

function indicatorThemeMap(): Map<string, HomophoneIndicatorTheme[]> {
  const map = new Map<string, HomophoneIndicatorTheme[]>();
  for (const entry of THEMED_HOMOPHONE_INDICATORS) {
    map.set(normalizeHomophoneIndicatorKey(entry.phrase), entry.themes);
  }
  return map;
}

/** Usage counts for indicators in archived homophone clues only. */
export function getHomophoneIndicatorUsageCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const clue of archivedHomophoneClues()) {
    const raw =
      clue.anagramIndicator?.trim() ||
      extractHomophoneIndicatorFromClue(clue.clue) ||
      "";
    if (!raw) continue;
    const key = normalizeHomophoneIndicatorKey(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export interface HomophoneIndicatorGuidance {
  avoid: string[];
  hot: string[];
  prefer: string[];
  archiveCounts: Map<string, number>;
}

export function buildHomophoneIndicatorGuidance(options: {
  sessionAvoid?: string[];
  seed?: string;
}): HomophoneIndicatorGuidance {
  const archiveCounts = getHomophoneIndicatorUsageCounts();
  const sessionAvoid = [
    ...new Set(
      (options.sessionAvoid ?? []).map(normalizeHomophoneIndicatorKey).filter(Boolean)
    ),
  ];

  const hot = [...archiveCounts.entries()]
    .filter(([, count]) => count >= HOMOPHONE_HOT_INDICATOR_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);

  const avoid = [...new Set([...sessionAvoid, ...hot])];

  const prefer = shuffleWithSeed(
    HOMOPHONE_INDICATORS.filter((phrase) => {
      const key = normalizeHomophoneIndicatorKey(phrase);
      return (
        !avoid.includes(key) &&
        !archiveCounts.has(key) &&
        !isOverusedHomophoneIndicator(phrase)
      );
    }),
    options.seed?.trim() || "homophone-prefer"
  ).slice(0, 18);

  return { avoid, hot, prefer, archiveCounts };
}

/** Indicators formatted for Claude prompts with variety guidance. */
export function homophoneIndicatorsForPrompt(options: {
  avoid?: string[];
  prefer?: string[];
  hot?: string[];
  archiveCounts?: Map<string, number>;
  seed?: string;
} = {}): string {
  const avoidSet = new Set(
    (options.avoid ?? []).map(normalizeHomophoneIndicatorKey)
  );
  const themeMap = indicatorThemeMap();
  const archiveCounts = options.archiveCounts ?? new Map<string, number>();

  const picked = pickHomophoneIndicatorPhrases({
    seed: options.seed ?? "homophone-prompt",
    avoid: [...avoidSet],
    maxItems: 36,
    archiveCounts,
  });

  const lines = picked.map((phrase) => {
    const themes = themeMap.get(normalizeHomophoneIndicatorKey(phrase));
    const themeLabel = themes?.length ? ` [${themes.join(", ")}]` : "";
    const uses = archiveCounts.get(normalizeHomophoneIndicatorKey(phrase)) ?? 0;
    const useLabel = uses > 0 ? ` (archive uses: ${uses})` : "";
    return `- "${phrase}"${themeLabel}${useLabel}`;
  });

  const guidance: string[] = [];
  if (options.prefer?.length) {
    guidance.push(
      `PREFER (rare / unused — use one if it fits): ${options.prefer
        .slice(0, 12)
        .map((p) => `"${p}"`)
        .join("; ")}`
    );
  }
  if (options.hot?.length) {
    guidance.push(
      `AVOID if possible (overused in archive): ${options.hot
        .slice(0, 10)
        .map((p) => `"${p}"`)
        .join(", ")}`
    );
  }
  guidance.push(
    `AVOID trailing "we hear" / "so we hear" endings unless no other fair indicator fits.`
  );

  return `${guidance.join("\n")}\n\nINDICATOR OPTIONS:\n${lines.join("\n")}`;
}
