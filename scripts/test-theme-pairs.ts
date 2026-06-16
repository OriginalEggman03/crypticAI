import { answerLengthBounds } from "../lib/anagram-difficulty";
import { parseInspiration } from "../lib/inspiration-parse";
import { listCandidatePairs } from "../lib/anagram-dictionary";
import { scoreAnswerRelevance } from "../lib/theme-scoring";

const inspiration = "Mortal Kombat characters";

const parsed = parseInspiration(inspiration);
console.log("Parsed:", parsed);

const bad = ["mortal", "immortal", "character", "mortality", "kombat"];
const good = ["scorpion", "raiden", "kano", "sonya", "johnny"];

console.log("\nAnswer relevance scores:");
for (const w of [...bad, ...good]) {
  console.log(`  ${w}: ${scoreAnswerRelevance(w, parsed)}`);
}

const easyBounds = answerLengthBounds("easy");

console.log("\nCandidate pairs (no Claude suggestions):");
for (const p of listCandidatePairs(inspiration, easyBounds, 10)) {
  console.log(
    `  ${p.answer} / "${p.fodder}"${p.isPhrase ? " [phrase]" : ""} score=${p.themeScore}`
  );
}

const suggested = [
  "RAIDEN",
  "SCORPION",
  "SUBZERO",
  "KANO",
  "JOHNNY CAGE",
  "LIU KANG",
  "MORTAL",
];
console.log("\nCandidate pairs (with Claude suggestions):");
for (const p of listCandidatePairs(inspiration, easyBounds, 10, {
  suggestedAnswers: suggested,
})) {
  const tags = [
    p.isPhrase ? "phrase-fodder" : null,
    p.isMultiWordAnswer ? "multi-word-answer" : null,
  ]
    .filter(Boolean)
    .join(", ");
  console.log(
    `  ${p.answer} / "${p.fodder}"${tags ? ` [${tags}]` : ""} score=${p.themeScore}`
  );
}

import { buildProgrammaticClue } from "../lib/anagram-fallback-clue";
import { verifyAnagramClue } from "../lib/anagram-engine";

const johnnyPair = listCandidatePairs(inspiration, easyBounds, 10, {
  suggestedAnswers: ["JOHNNY CAGE"],
})[0];
if (johnnyPair) {
  const clue = buildProgrammaticClue(johnnyPair, inspiration);
  console.log("\nJOHNNY CAGE programmatic clue:", clue?.clue);
  if (clue) console.log("Verified:", verifyAnagramClue(clue).ok);
}
