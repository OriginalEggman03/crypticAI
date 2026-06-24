/**
 * Diagnose pipeline failures for a user inspiration (no API calls for pair search).
 * Usage: npx tsx scripts/diagnose-anagram-failure.ts "your inspiration"
 */
import { answerLengthBounds } from "../lib/anagram-difficulty";
import { verifyAnagramClue } from "../lib/anagram-engine";
import { buildProgrammaticClue } from "../lib/anagram-fallback-clue";
import {
  defaultMaxAnswersToProcess,
  listCandidatePairs,
} from "../lib/anagram-dictionary";
import { themeDefinitionSeeds } from "../lib/definition-quality";
import { generateVerifiedAnagramClue } from "../lib/anagram-pipeline";
import { readFileSync } from "node:fs";

const inspiration = process.argv.slice(2).join(" ").trim() || "herbal teas and infusions";

const bounds = answerLengthBounds("easy");
const pairs = listCandidatePairs(inspiration, bounds, 48, {
  suggestedAnswers: [],
  excludeAnswers: [],
  dictionaryScanLimit: 80,
  maxAnswersToProcess: 32,
});

console.log("Inspiration:", inspiration);
console.log("Theme definition seeds:", themeDefinitionSeeds(inspiration, pairs[0]?.answer ?? "TEST"));
console.log("Candidate pairs:", pairs.length);
if (pairs.length === 0) {
  console.log("FAIL: No valid anagram pair could be found for this inspiration.");
  process.exit(0);
}

let templatesBuilt = 0;
let templatesFailed = 0;
const failureReasons = new Map<string, number>();

for (const pair of pairs.slice(0, 12)) {
  const template = buildProgrammaticClue(pair, inspiration, {});
  if (template) {
    templatesBuilt++;
    continue;
  }
  templatesFailed++;

  const draft = {
    answer: pair.answer,
    clue: `A thematic answer: ${pair.fodder} in chaos (${pair.answer.replace(/[^A-Z]/g, "").length})`,
    anagramFodder: pair.fodder,
    anagramIndicator: "in chaos",
  };
  const v = verifyAnagramClue(draft, { inspiration });
  for (const err of v.errors) {
    failureReasons.set(err, (failureReasons.get(err) ?? 0) + 1);
  }
}

console.log(`Templates built: ${templatesBuilt}/${Math.min(12, pairs.length)}`);
console.log("Sample pairs:", pairs.slice(0, 5).map((p) => `${p.answer} <- ${p.fodder}`));

if (failureReasons.size > 0) {
  console.log("\nCommon verification failures on crude fallback:");
  for (const [reason, count] of [...failureReasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`  [${count}x] ${reason}`);
  }
}

const env = readFileSync(".env.local", "utf8");
const apiKey = env.match(/^ANTHROPIC_API_KEY=(.+)$/m)?.[1]?.trim();
if (apiKey && process.argv.includes("--live")) {
  console.log("\n--- Live pipeline ---");
  generateVerifiedAnagramClue(apiKey, { inspiration, difficulty: "easy" }).then((out) => {
    if ("error" in out) {
      console.log("PIPELINE ERROR:", out.error);
      console.log("LLM calls:", out.llmCalls);
    } else {
      console.log("OK:", out.clue.clue);
      console.log("Strategy:", out.strategy);
    }
  });
}
