import { loadEnvLocal } from "@/lib/load-env-local";
import {
  getHomophonePartners,
  getHomophoneStats,
  getHomophoneSynonyms,
  rebuildHomophoneDatabase,
} from "@/lib/db/homophones";
import {
  buildHomophoneGroupsFromCmu,
  buildHomophoneGroupsSpellingOnly,
  isValidHomophoneLexiconWord,
} from "@/lib/homophone-phonetics";
import { isStandardDictionaryHeadword } from "@/lib/dictionary-proper-nouns";
import { requiresCapitalizationInClue } from "@/lib/dictionary-proper-nouns";
import {
  countMissingFullDefinitions,
  findSameMeaningPairsInGroups,
  getCachedFullDefinition,
  populateGlossCache,
} from "@/lib/homophone-meaning";
import {
  buildValidatedHomophonePairs,
  pairCombinationsFromGroup,
} from "@/lib/homophone-pair-build";
import {
  haveSameMeaning,
  isDistinctHomophonePair,
} from "@/lib/homophone-variants";
import { DatabaseSync } from "node:sqlite";
import { join as pathJoin } from "node:path";

loadEnvLocal();

function countDistinctPairCombinations(groups: { words: string[] }[]): number {
  const seen = new Set<string>();
  for (const group of groups) {
    for (const [a, b] of pairCombinationsFromGroup(group.words)) {
      if (!isDistinctHomophonePair(a, b)) continue;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      seen.add(key);
    }
  }
  return seen.size;
}

function countWordEntries(groups: { words: string[] }[]): number {
  return groups.reduce((sum, group) => sum + group.words.length, 0);
}

async function populateGlossCacheWithRetries(words: string[]): Promise<number> {
  const priorityWords = [
    "kernel",
    "colonel",
    "meat",
    "meet",
    "mete",
    "steak",
    "stake",
    "thyme",
    "time",
    "flour",
    "flower",
    "knight",
    "night",
    "write",
    "right",
    "allowed",
    "aloud",
    "gauntlet",
    "gantlet",
  ];
  await populateGlossCache(priorityWords);

  let totalAdded = 0;
  const maxRounds = 5;

  for (let round = 1; round <= maxRounds; round++) {
    const missingBefore = countMissingFullDefinitions(words);
    if (missingBefore === 0) break;

    const added = await populateGlossCache(words);
    totalAdded += added;
    const missingAfter = countMissingFullDefinitions(words);
    console.log(
      `Definition cache round ${round}: +${added} (${missingBefore - missingAfter} resolved, ${missingAfter} still missing).`
    );
    if (added === 0 || missingAfter === 0) break;
  }

  return totalAdded;
}

async function main() {
  const beforeGroups = buildHomophoneGroupsSpellingOnly();
  const beforePairCount = countDistinctPairCombinations(beforeGroups);
  const beforeWordCount = countWordEntries(beforeGroups);
  const builtGroups = buildHomophoneGroupsFromCmu();
  const candidateWords = [...new Set(builtGroups.flatMap((g) => g.words))];

  console.log(
    `Before meaning filter: ${beforeGroups.length} groups, ${beforeWordCount} words, ${beforePairCount} candidate pairs.`
  );

  const glossAdded = await populateGlossCacheWithRetries(candidateWords);
  if (glossAdded > 0) {
    console.log(`Fetched ${glossAdded} new dictionary glosses for cache.`);
  }

  const removedPairs = findSameMeaningPairsInGroups(
    beforeGroups.map((g) => g.words),
    haveSameMeaning
  );
  console.log(
    `Same-meaning pairs to remove (inflection/spelling/gloss): ${removedPairs.length}`
  );
  if (removedPairs.length > 0) {
    const examples = removedPairs
      .slice(0, 20)
      .map(({ a, b }) => `${a}/${b}`)
      .join(", ");
    console.log(`Examples: ${examples}${removedPairs.length > 20 ? ", …" : ""}`);
  }

  const candidatePairs = await buildValidatedHomophonePairs(
    builtGroups,
    async (word) => getCachedFullDefinition(word) ?? null
  );
  const stats = await rebuildHomophoneDatabase();
  console.log(
    `Homophone database rebuilt: ${stats.pairs} validated pairs, ${stats.words} words.`
  );
  console.log(
    `After filters: ${stats.pairs} pairs, ${stats.words} words (from ${countDistinctPairCombinations(builtGroups)} distinct candidate pairs).`
  );
  console.log(
    `Removed by meaning/definition filters: ${beforePairCount - stats.pairs} candidate pairs.`
  );

  const meaningChecks: Array<{ fn: () => boolean; label: string }> = [
    {
      label: "tableau/tableaux rejected",
      fn: () =>
        !isDistinctHomophonePair("tableau", "tableaux") &&
        !getHomophonePartners("tableau").includes("tableaux"),
    },
    {
      label: "meat/meet still paired",
      fn: () =>
        isDistinctHomophonePair("meat", "meet") &&
        getHomophonePartners("meat").includes("meet"),
    },
    {
      label: "steak/stake still paired",
      fn: () =>
        isDistinctHomophonePair("steak", "stake") &&
        getHomophonePartners("steak").includes("stake"),
    },
    {
      label: "kernel/colonel still paired",
      fn: () =>
        isDistinctHomophonePair("kernel", "colonel") &&
        getHomophonePartners("kernel").includes("colonel"),
    },
    {
      label: "gauntlet/gantlet excluded (gantlet has no dictionary entry)",
      fn: () =>
        !getHomophonePartners("gauntlet").includes("gantlet") &&
        !getHomophonePartners("gantlet").includes("gauntlet"),
    },
  ];

  const checks: Array<{ word: string; expect: string[] }> = [
    { word: "kernel", expect: ["colonel"] },
    { word: "colonel", expect: ["kernel"] },
    { word: "meat", expect: ["meet"] },
    { word: "meet", expect: ["meat"] },
    { word: "thyme", expect: ["time"] },
    { word: "time", expect: ["thyme"] },
    { word: "steak", expect: ["stake"] },
    { word: "stake", expect: ["steak"] },
  ];

  const mustNotPair: Array<{ a: string; b: string }> = [
    { a: "breeding", b: "breathing" },
    { a: "bladder", b: "blather" },
    { a: "calm", b: "com" },
    { a: "calm", b: "comm" },
    { a: "com", b: "comm" },
    { a: "tableau", b: "tableaux" },
    { a: "tableaux", b: "tableau" },
    { a: "gauntlet", b: "gantlet" },
    { a: "gantlet", b: "gauntlet" },
    { a: "practice", b: "practise" },
    { a: "practise", b: "practice" },
    { a: "cream", b: "creme" },
    { a: "creme", b: "cream" },
    { a: "bally", b: "bailey" },
    { a: "bailey", b: "bally" },
    { a: "populace", b: "populous" },
    { a: "populous", b: "populace" },
    { a: "schilling", b: "shilling" },
    { a: "shilling", b: "schilling" },
    { a: "krona", b: "krone" },
    { a: "krone", b: "krona" },
    { a: "dike", b: "dyke" },
    { a: "dyke", b: "dike" },
    { a: "caulk", b: "cock" },
    { a: "cock", b: "caulk" },
    { a: "dam", b: "damn" },
    { a: "damn", b: "dam" },
  ];

  let failed = 0;
  for (const { label, fn } of meaningChecks) {
    if (!fn()) {
      failed++;
      console.error(`FAIL ${label}`);
    } else {
      console.log(`OK   ${label}`);
    }
  }

  for (const { word, expect } of checks) {
    const partners = getHomophonePartners(word);
    const missing = expect.filter((item) => !partners.includes(item));
    if (missing.length > 0) {
      failed++;
      console.error(
        `FAIL ${word}: missing ${missing.join(", ")} (got ${partners.slice(0, 8).join(", ")})`
      );
    } else {
      console.log(`OK   ${word} -> ${expect.join(", ")}`);
    }
  }

  const sampleWords = ["kernel", "meat", "steak", "ana", "aug", "calm", "com", "comm"];
  let lexiconViolations = 0;
  for (const word of sampleWords) {
    if (word === "com" || word === "comm") {
      const partners = getHomophonePartners(word);
      if (partners.length > 0) {
        lexiconViolations++;
        console.error(
          `LEXICON abbreviation should have no partners: ${word} -> ${partners.join(", ")}`
        );
      }
      continue;
    }

    for (const partner of getHomophonePartners(word)) {
      if (!isStandardDictionaryHeadword(partner)) {
        lexiconViolations++;
        console.error(`LEXICON not a standard headword: ${word} -> ${partner}`);
      }
      if (requiresCapitalizationInClue(partner)) {
        lexiconViolations++;
        console.error(`LEXICON proper noun: ${word} -> ${partner}`);
      }
      if (!isValidHomophoneLexiconWord(partner)) {
        lexiconViolations++;
        console.error(`LEXICON invalid: ${word} -> ${partner}`);
      }
    }
  }

  const dbPath =
    process.env.DATABASE_PATH ?? pathJoin(process.cwd(), "data", "clues.db");
  const db = new DatabaseSync(dbPath);
  const allDbWords = db
    .prepare(
      `SELECT DISTINCT word FROM (
        SELECT word_a AS word FROM homophone_pairs
        UNION
        SELECT word_b AS word FROM homophone_pairs
      ) ORDER BY word COLLATE NOCASE`
    )
    .all() as { word: string }[];

  for (const { word } of allDbWords) {
    if (!isValidHomophoneLexiconWord(word)) {
      lexiconViolations++;
      console.error(`DB word fails lexicon check: ${word}`);
    }
  }

  let missingDefinitionViolations = 0;
  const pairRows = db
    .prepare(
      `SELECT word_a, word_b, definition_a, definition_b
       FROM homophone_pairs`
    )
    .all() as Array<{
      word_a: string;
      word_b: string;
      definition_a: string;
      definition_b: string;
    }>;

  for (const row of pairRows) {
    if (!row.definition_a.trim() || !row.definition_b.trim()) {
      missingDefinitionViolations++;
      console.error(`PAIR missing definition: ${row.word_a}/${row.word_b}`);
    }
  }

  let falsePairViolations = 0;
  for (const { a, b } of mustNotPair) {
    const aPartners = getHomophonePartners(a);
    const bPartners = getHomophonePartners(b);
    if (aPartners.includes(b) || bPartners.includes(a)) {
      falsePairViolations++;
      console.error(`FALSE PAIR still grouped: ${a} <-> ${b}`);
    } else {
      console.log(`OK   ${a} not paired with ${b}`);
    }
  }

  const variantChecks: Array<{ a: string; b: string }> = [
    { a: "blond", b: "blonde" },
    { a: "gray", b: "grey" },
    { a: "dialog", b: "dialogue" },
    { a: "check", b: "cheque" },
    { a: "bluish", b: "blueish" },
    { a: "draft", b: "draught" },
    { a: "disc", b: "disk" },
    { a: "practice", b: "practise" },
    { a: "defense", b: "defence" },
    { a: "analyze", b: "analyse" },
    { a: "color", b: "colour" },
    { a: "center", b: "centre" },
    { a: "cream", b: "creme" },
    { a: "naive", b: "naïve" },
  ];

  let variantViolations = 0;
  for (const { a, b } of variantChecks) {
    const aPartners = getHomophonePartners(a);
    const bPartners = getHomophonePartners(b);
    if (aPartners.includes(b) || bPartners.includes(a)) {
      variantViolations++;
      console.error(`VARIANT still paired: ${a} <-> ${b}`);
    }
  }

  if (variantViolations === 0) {
    console.log(`OK   spelling variants excluded (${variantChecks.length} checks)`);
  }

  const final = getHomophoneStats();
  const sampleSynonyms = getHomophoneSynonyms("cash");
  console.log(
    `Final stats: ${final.pairs} pairs, ${final.words} words, ${candidatePairs.length} validated at build time, cash synonyms=${sampleSynonyms.length}.`
  );

  if (
    failed > 0 ||
    lexiconViolations > 0 ||
    variantViolations > 0 ||
    falsePairViolations > 0 ||
    missingDefinitionViolations > 0
  ) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
