/**
 * Compare anagram lookup: legacy signature index vs trie-prefix-tree vs @cdot/dictionary.
 * Usage: npx tsx scripts/compare-anagram-libs.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Dictionary } = require("@cdot/dictionary") as typeof import("@cdot/dictionary");
import { findFodderCandidates, findPhraseFodderCandidates } from "../lib/anagram-dictionary";
import { trieAnagrams, trieSubAnagrams } from "../lib/anagram-trie";
import { loadBritishWords } from "../lib/word-list";

const TEST_ANSWERS = ["THING", "NIGHT", "RISTRETTO", "HERO", "ROSE"];

function legacySignatureAnagrams(answer: string): string[] {
  const words = loadBritishWords();
  const sig = answer.toLowerCase().split("").sort().join("");
  const out: string[] = [];
  for (const w of words) {
    if (w === answer.toLowerCase()) continue;
    if (w.split("").sort().join("") === sig) out.push(w);
  }
  return out;
}

type CdotDictionary = InstanceType<typeof Dictionary>;

async function loadCdotDictionary(): Promise<CdotDictionary | null> {
  const dawgPath = join(process.cwd(), "data", "en-gb.dawg");
  if (!existsSync(dawgPath)) {
    console.log("Building @cdot/dictionary DAWG (one-time)…");
    const { execSync } = await import("node:child_process");
    const dataDir = join(process.cwd(), "data");
    mkdirSync(dataDir, { recursive: true });
    const wordListPath = join(dataDir, "en-gb-words.txt");
    const words = loadBritishWords();
    writeFileSync(wordListPath, words.join("\n"), "utf8");
    execSync(
      `node node_modules/@cdot/dictionary/bin/compress.js "${wordListPath}" "${dawgPath}"`,
      { stdio: "inherit" }
    );
  }

  const buf = readFileSync(dawgPath);
  const dict = new Dictionary("en-gb");
  dict.loadDAWG(buf);
  dict.addLinks();
  return dict;
}

function cdotExactAnagrams(dict: CdotDictionary, answer: string): string[] {
  const found = dict.findAnagrams(answer.toUpperCase()) as Record<string, string>;
  const normalized = answer.toLowerCase();
  return Object.keys(found)
    .map((w) => w.toLowerCase())
    .filter((w) => w !== normalized && w.length === normalized.length);
}

async function main() {
  console.log("=== Anagram library comparison ===\n");
  console.log(`Dictionary size: ${loadBritishWords().length} words\n`);

  let cdot: CdotDictionary | null = null;
  try {
    cdot = await loadCdotDictionary();
  } catch (err) {
    console.warn("@cdot/dictionary skipped:", err);
  }

  for (const answer of TEST_ANSWERS) {
    const legacy = legacySignatureAnagrams(answer);
    const trie = trieAnagrams(answer).filter((w) => w !== answer.toLowerCase());
    const trieSub = trieSubAnagrams(answer).length;
    const integrated = findFodderCandidates(answer);
    const phrases = findPhraseFodderCandidates(answer, 5);
    const cdotList = cdot ? cdotExactAnagrams(cdot, answer) : [];

    console.log(`--- ${answer} ---`);
    console.log(`  legacy signature: ${legacy.length} (${legacy.slice(0, 5).join(", ")}…)`);
    console.log(`  trie exact:       ${trie.length} (${trie.slice(0, 5).join(", ")}…)`);
    console.log(`  trie sub-anagrams: ${trieSub} total`);
    console.log(`  integrated:       ${integrated.length}`);
    if (cdot) console.log(`  @cdot/dictionary:  ${cdotList.length}`);
    console.log(`  phrase fodder:    ${phrases.length} (${phrases.slice(0, 3).join(" | ")})`);
    console.log();
  }
}

main().catch(console.error);
