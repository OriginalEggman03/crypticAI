/** Apostrophe-stripped forms that read poorly in clue surfaces. */
export const CONTRACTION_FRAGMENTS = new Set([
  "thatd",
  "dont",
  "wont",
  "cant",
  "isnt",
  "arent",
  "wasnt",
  "werent",
  "hasnt",
  "havent",
  "hadnt",
  "didnt",
  "wouldnt",
  "couldnt",
  "shouldnt",
  "mightnt",
  "mustnt",
  "neednt",
  "youre",
  "theyre",
  "weve",
  "theyve",
  "youve",
  "ive",
  "im",
  "whos",
  "whats",
  "wheres",
  "hows",
  "theres",
  "hes",
  "shes",
]);

/** [first token, second token, surface form] — merge when adjacent in the clue. */
export const CONTRACTION_PAIRS: [string, string, string][] = [
  ["that", "d", "That'd"],
  ["don", "t", "Don't"],
  ["won", "t", "Won't"],
  ["can", "t", "Can't"],
  ["isn", "t", "Isn't"],
  ["aren", "t", "Aren't"],
  ["wasn", "t", "Wasn't"],
  ["weren", "t", "Weren't"],
  ["hasn", "t", "Hasn't"],
  ["haven", "t", "Haven't"],
  ["hadn", "t", "Hadn't"],
  ["didn", "t", "Didn't"],
  ["wouldn", "t", "Wouldn't"],
  ["couldn", "t", "Couldn't"],
  ["shouldn", "t", "Shouldn't"],
  ["you", "re", "You're"],
  ["they", "re", "They're"],
  ["we", "ve", "We've"],
  ["they", "ve", "They've"],
  ["you", "ve", "You've"],
  ["i", "ve", "I've"],
  ["i", "m", "I'm"],
  ["who", "s", "Who's"],
  ["what", "s", "What's"],
  ["where", "s", "Where's"],
  ["how", "s", "How's"],
  ["there", "s", "There's"],
  ["he", "s", "He's"],
  ["she", "s", "She's"],
  ["it", "s", "It's"],
  ["let", "s", "Let's"],
];

const FRAGMENT_SURFACE: Record<string, string> = {
  thatd: "That'd",
  dont: "Don't",
  wont: "Won't",
  cant: "Can't",
  isnt: "Isn't",
  arent: "Aren't",
  wasnt: "Wasn't",
  werent: "Weren't",
  hasnt: "Hasn't",
  havent: "Haven't",
  hadnt: "Hadn't",
  didnt: "Didn't",
  wouldnt: "Wouldn't",
  couldnt: "Couldn't",
  shouldnt: "Shouldn't",
  youre: "You're",
  theyre: "They're",
  weve: "We've",
  theyve: "They've",
  youve: "You've",
  ive: "I've",
  im: "I'm",
  whos: "Who's",
  whats: "What's",
  wheres: "Where's",
  hows: "How's",
  theres: "There's",
  hes: "He's",
  shes: "She's",
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isContractionFragment(word: string): boolean {
  return CONTRACTION_FRAGMENTS.has(word.toLowerCase().replace(/[^a-z]/g, ""));
}

export function fodderHasContractionFragment(fodder: string): boolean {
  return fodder
    .toLowerCase()
    .split(/\s+/)
    .some((token) => isContractionFragment(token));
}

/** Fix apostrophe-stripped contraction forms in the clue surface. */
export function restoreContractionsInClue(clue: string): string {
  let body = clue.replace(/\(\d+(?:,\s*\d+)*\)\s*$/, "");
  const suffix = clue.slice(body.length);

  for (const [first, second, surface] of CONTRACTION_PAIRS) {
    const re = new RegExp(
      `\\b${escapeRegExp(first)}\\s+${escapeRegExp(second)}\\b`,
      "gi"
    );
    body = body.replace(re, surface);
  }

  for (const [fragment, surface] of Object.entries(FRAGMENT_SURFACE)) {
    const re = new RegExp(`\\b${escapeRegExp(fragment)}\\b`, "gi");
    body = body.replace(re, surface);
  }

  return body + suffix;
}

export function verifyClueContractionSpelling(clue: string): string | null {
  const body = clue.replace(/\(\d+(?:,\s*\d+)*\)\s*$/, "");
  const found: string[] = [];

  for (const fragment of CONTRACTION_FRAGMENTS) {
    const re = new RegExp(`\\b${escapeRegExp(fragment)}\\b`, "i");
    if (re.test(body)) found.push(fragment);
  }

  if (found.length === 0) return null;

  const example = FRAGMENT_SURFACE[found[0]] ?? `${found[0]}'…`;
  return `Clue uses broken contraction spelling (${found.join(", ")}) — use natural forms such as "${example}" with an apostrophe`;
}

/** Reject fodder clusters that are only a contraction fragment plus a name. */
export function verifyFodderClusterReadability(
  clue: string,
  fodder: string
): string | null {
  const tokens = fodder
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z]/g, ""))
    .filter(Boolean);

  if (tokens.length !== 2) return null;

  const fragments = tokens.filter(isContractionFragment);
  if (fragments.length !== 1) return null;

  const contractionErr = verifyClueContractionSpelling(clue);
  if (contractionErr) return contractionErr;

  return `Fodder "${fodder}" does not form a natural phrase in the clue — avoid "${fragments[0]}" without an apostrophe (e.g. That'd, not Thatd)`;
}
