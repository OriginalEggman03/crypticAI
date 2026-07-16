import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { lookupDictionaryDefinition } from "./answer-context";

/** Plural or other inflected form → singular/base lemma. */
const IRREGULAR_TO_LEMMA: Readonly<Record<string, string>> = {
  men: "man",
  women: "woman",
  children: "child",
  teeth: "tooth",
  feet: "foot",
  mice: "mouse",
  geese: "goose",
  oxen: "ox",
  leaves: "leaf",
  lives: "life",
  knives: "knife",
  wives: "wife",
  wolves: "wolf",
  halves: "half",
  calves: "calf",
  selves: "self",
  shelves: "shelf",
  thieves: "thief",
  loaves: "loaf",
  potatoes: "potato",
  tomatoes: "tomato",
  heroes: "hero",
  echoes: "echo",
  vetoes: "veto",
  tableaux: "tableau",
  beaux: "beau",
  chateaux: "chateau",
  bureaux: "bureau",
  gateaux: "gateau",
  plateaux: "plateau",
  criteria: "criterion",
  phenomena: "phenomenon",
  bacteria: "bacterium",
  alumni: "alumnus",
  axes: "axis",
  indices: "index",
  matrices: "matrix",
  vertices: "vertex",
};

const GLOSS_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "to",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "or",
  "and",
  "as",
  "is",
  "are",
  "be",
  "being",
  "been",
  "that",
  "which",
  "who",
  "whom",
  "this",
  "these",
  "those",
  "it",
  "its",
  "one",
  "some",
  "any",
  "such",
]);

let glossCache: Map<string, string> | null = null;
let fullDefinitionCache: Map<
  string,
  { definition: string; partOfSpeech?: string }
> | null = null;

interface GlossCacheFileEntry {
  gloss?: string;
  definition?: string;
  partOfSpeech?: string;
}

function glossCachePath(): string {
  return join(process.cwd(), "data", "homophone-gloss-cache.json");
}

function loadGlossCache(): Map<string, string> {
  if (glossCache) return glossCache;

  glossCache = new Map();
  fullDefinitionCache = new Map();
  const path = glossCachePath();
  if (!existsSync(path)) return glossCache;

  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Record<
      string,
      string | GlossCacheFileEntry
    >;
    for (const [word, entry] of Object.entries(raw)) {
      const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
      if (!normalized) continue;

      if (typeof entry === "string") {
        if (entry) glossCache.set(normalized, entry);
        continue;
      }

      const gloss = entry.gloss ?? (entry.definition ? normalizeDefinitionGloss(entry.definition) : "");
      if (gloss) glossCache.set(normalized, gloss);
      if (entry.definition?.trim()) {
        fullDefinitionCache.set(normalized, {
          definition: entry.definition.trim(),
          partOfSpeech: entry.partOfSpeech,
        });
      }
    }
  } catch {
    glossCache = new Map();
    fullDefinitionCache = new Map();
  }

  return glossCache;
}

function loadFullDefinitionCache(): Map<
  string,
  { definition: string; partOfSpeech?: string }
> {
  loadGlossCache();
  return fullDefinitionCache ?? new Map();
}

export function saveGlossCache(entries: Map<string, string>): void {
  const path = glossCachePath();
  mkdirSync(dirname(path), { recursive: true });
  const fullCache = loadFullDefinitionCache();
  const obj: Record<string, GlossCacheFileEntry> = {};
  for (const [word, gloss] of [...entries.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const full = fullCache.get(word);
    obj[word] = full
      ? {
          gloss,
          definition: full.definition,
          partOfSpeech: full.partOfSpeech,
        }
      : { gloss };
  }
  writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
  glossCache = new Map(entries);
}

/** Normalize a dictionary gloss for comparison. */
export function normalizeDefinitionGloss(definition: string): string {
  const cleaned = definition
    .replace(/\([^)]*\)/g, "")
    .replace(/;/g, ",")
    .trim()
    .toLowerCase();
  const withoutArticle = cleaned.replace(/^(?:a|an|the)\s+/, "");
  const firstClause = withoutArticle.split(/[,;]/)[0]?.trim() ?? withoutArticle;
  return firstClause.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function glossContentWords(gloss: string): Set<string> {
  return new Set(
    gloss
      .split(/\s+/)
      .filter((w) => w.length > 1 && !GLOSS_STOPWORDS.has(w))
  );
}

const CURRENCY_DOMAIN_WORDS = new Set([
  "coin",
  "coins",
  "currency",
  "currencies",
  "monetary",
  "money",
]);

const TEMPORAL_CURRENCY_WORDS = new Set([
  "former",
  "formerly",
  "old",
  "obsolete",
  "discontinued",
  "defunct",
]);

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/** True when a gloss names a specific national coin or currency unit. */
export function isNamedCurrencyOrCoinGloss(gloss: string): boolean {
  const g = normalizeDefinitionGloss(gloss);
  if (!g) return false;
  if (/\bofficial currency of\b/.test(g)) return true;
  if (/\b(?:old|former) currency of\b/.test(g)) return true;
  if (/\bcurrency of\b/.test(g)) return true;
  if (/\bcoin formerly\b/.test(g)) return true;
  if (/\bformerly used\b/.test(g) && /\bcoin\b/.test(g)) return true;
  return false;
}

/** True when spellings differ slightly but share an obvious root (schilling/shilling). */
export function areNearRelatedSpellings(a: string, b: string): boolean {
  const wa = a.toLowerCase().replace(/[^a-z]/g, "");
  const wb = b.toLowerCase().replace(/[^a-z]/g, "");
  if (!wa || !wb || wa === wb) return wa === wb;

  const [shorter, longer] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  if (longer.includes(shorter) && shorter.length >= 5 && longer.length - shorter.length <= 2) {
    return true;
  }

  const editDistance = levenshtein(wa, wb);
  if (editDistance > 1 || Math.min(wa.length, wb.length) < 4) return false;

  if (Math.abs(wa.length - wb.length) <= 1) return true;

  return wa.slice(0, 4) === wb.slice(0, 4);
}

function glossHasHistoricalCurrencySense(gloss: string): boolean {
  const g = normalizeDefinitionGloss(gloss);
  if (!g) return false;
  if (isNamedCurrencyOrCoinGloss(g)) return true;

  const words = glossContentWords(g);
  const wordList = [...words];
  const hasCurrency = wordList.some((w) => CURRENCY_DOMAIN_WORDS.has(w));
  const hasTemporal = wordList.some((w) => TEMPORAL_CURRENCY_WORDS.has(w));
  return hasCurrency && hasTemporal;
}

/** True when both words name closely related coins/currencies (e.g. schilling/shilling). */
export function haveSameCurrencyCoinSense(a: string, b: string): boolean {
  const glossA = getCachedDefinitionGloss(a);
  const glossB = getCachedDefinitionGloss(b);
  if (!glossA || !glossB) return false;

  const namedA = isNamedCurrencyOrCoinGloss(glossA);
  const namedB = isNamedCurrencyOrCoinGloss(glossB);
  if (namedA && namedB && areNearRelatedSpellings(a, b)) {
    return true;
  }

  if (
    glossHasHistoricalCurrencySense(glossA) &&
    glossHasHistoricalCurrencySense(glossB) &&
    areNearRelatedSpellings(a, b)
  ) {
    return true;
  }

  return false;
}

/** True when two normalized glosses describe the same sense. */
export function definitionGlossesOverlap(a: string, b: string): boolean {
  const ga = normalizeDefinitionGloss(a);
  const gb = normalizeDefinitionGloss(b);
  if (!ga || !gb) return false;
  if (ga === gb) return true;

  if (ga.length >= 12 && gb.length >= 12) {
    if (ga.includes(gb) || gb.includes(ga)) return true;
  }

  const wordsA = glossContentWords(ga);
  const wordsB = glossContentWords(gb);
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 && intersection / union >= 0.72;
}

export function getCachedDefinitionGloss(word: string): string | undefined {
  const key = word.toLowerCase().replace(/[^a-z]/g, "");
  return key ? loadGlossCache().get(key) : undefined;
}

export function getCachedFullDefinition(
  word: string
): { definition: string; partOfSpeech?: string } | undefined {
  const key = word.toLowerCase().replace(/[^a-z]/g, "");
  return key ? loadFullDefinitionCache().get(key) : undefined;
}

export function cacheDefinitionGloss(word: string, definition: string): void {
  const key = word.toLowerCase().replace(/[^a-z]/g, "");
  const gloss = normalizeDefinitionGloss(definition);
  if (!key || !gloss) return;
  loadGlossCache().set(key, gloss);
}

export function cacheFullDefinition(
  word: string,
  definition: string,
  partOfSpeech?: string
): void {
  const key = word.toLowerCase().replace(/[^a-z]/g, "");
  const gloss = normalizeDefinitionGloss(definition);
  if (!key || !gloss || !definition.trim()) return;
  loadGlossCache().set(key, gloss);
  loadFullDefinitionCache().set(key, {
    definition: definition.trim(),
    partOfSpeech,
  });
}

/** Derive a base-lemma key for inflection matching. */
export function lemmaKey(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return w;

  const irregular = IRREGULAR_TO_LEMMA[w];
  if (irregular) return irregular;

  if (w.endsWith("ies") && w.length > 4) {
    const candidate = `${w.slice(0, -3)}y`;
    if (candidate.length >= 3) return candidate;
  }

  if (w.endsWith("ves") && w.length > 4) {
    const f = `${w.slice(0, -3)}f`;
    const fe = `${w.slice(0, -3)}fe`;
    if (fe.length >= 3) return fe;
    if (f.length >= 3) return f;
  }

  if (w.endsWith("oes") && w.length > 4) {
    return w.slice(0, -2);
  }

  if (w.endsWith("es") && w.length > 3) {
    const stem = w.slice(0, -2);
    if (
      stem.endsWith("s") ||
      stem.endsWith("x") ||
      stem.endsWith("z") ||
      stem.endsWith("ch") ||
      stem.endsWith("sh")
    ) {
      return stem;
    }
  }

  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 2) {
    return w.slice(0, -1);
  }

  return w;
}

/** True when two words are inflections of the same lemma (plural/singular, etc.). */
export function areInflectionalVariants(a: string, b: string): boolean {
  const wa = a.toLowerCase().replace(/[^a-z]/g, "");
  const wb = b.toLowerCase().replace(/[^a-z]/g, "");
  if (!wa || !wb || wa === wb) return wa === wb;

  const la = lemmaKey(wa);
  const lb = lemmaKey(wb);
  if (la === lb) return true;
  if (la === wb || lb === wa) return true;

  return false;
}

/** True when cached dictionary glosses describe the same meaning. */
export function haveSameCachedDefinition(a: string, b: string): boolean {
  const glossA = getCachedDefinitionGloss(a);
  const glossB = getCachedDefinitionGloss(b);
  if (!glossA || !glossB) return false;
  if (definitionGlossesOverlap(glossA, glossB)) return true;
  return haveSameCurrencyCoinSense(a, b);
}


const FETCH_DELAY_MS = 120;
const FETCH_CONCURRENCY = 4;
const FETCH_MAX_ATTEMPTS = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGlossForWord(
  word: string,
  cache: Map<string, string>
): Promise<boolean> {
  for (let attempt = 0; attempt < FETCH_MAX_ATTEMPTS; attempt++) {
    const dict = await lookupDictionaryDefinition(word);
    if (dict?.definition) {
      cacheFullDefinition(word, dict.definition, dict.partOfSpeech);
      cache.set(word, normalizeDefinitionGloss(dict.definition));
      return true;
    }
    await sleep(FETCH_DELAY_MS * (attempt + 1));
  }
  return false;
}

export function countMissingFullDefinitions(words: string[]): number {
  const unique = [...new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")))].filter(
    Boolean
  );
  return unique.filter((word) => !getCachedFullDefinition(word)).length;
}

/** Fetch and cache glosses for words missing from the local cache. */
export async function populateGlossCache(words: string[]): Promise<number> {
  const cache = loadGlossCache();
  const unique = [...new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")))].filter(
    Boolean
  );
  const missing = unique
    .filter((word) => !getCachedFullDefinition(word))
    .sort();
  if (missing.length === 0) return 0;

  let added = 0;
  let index = 0;

  async function worker(): Promise<void> {
    while (index < missing.length) {
      const word = missing[index++];
      const hadCachedDefinition = Boolean(getCachedFullDefinition(word));
      const ok = await fetchGlossForWord(word, cache);
      if (ok && !hadCachedDefinition) added++;
      await sleep(FETCH_DELAY_MS);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(FETCH_CONCURRENCY, missing.length) }, () => worker())
  );

  if (added > 0) saveGlossCache(cache);
  return added;
}

/** Find word pairs in groups that share meaning. */
export function findSameMeaningPairsInGroups(
  groups: string[][],
  sameMeaning: (a: string, b: string) => boolean
): Array<{ a: string; b: string }> {
  const pairs: Array<{ a: string; b: string }> = [];

  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (sameMeaning(group[i], group[j])) {
          pairs.push({ a: group[i], b: group[j] });
        }
      }
    }
  }

  return pairs;
}

export function resetGlossCacheForTests(): void {
  glossCache = null;
  fullDefinitionCache = null;
}
