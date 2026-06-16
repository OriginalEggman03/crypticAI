import assert from "node:assert/strict";
import {
  restoreContractionsInClue,
  verifyClueContractionSpelling,
  fodderHasContractionFragment,
} from "../lib/fodder-contractions";
import { prepareAnagramClue, verifyAnagramClue } from "../lib/anagram-engine";
import { isGrammaticalDictionaryFodder } from "../lib/fodder-quality";
import { phraseAppearsAsFodderWords } from "../lib/fodder-surface";

assert.equal(
  restoreContractionsInClue("Thatd, Mary in chaos (5,4)"),
  "That'd, Mary in chaos (5,4)"
);

assert.equal(
  restoreContractionsInClue("that d army in chaos (5,4)"),
  "That'd army in chaos (5,4)"
);

assert.ok(verifyClueContractionSpelling("That'd army in chaos (5,4)") === null);
assert.ok(verifyClueContractionSpelling("Thatd, Mary (5,4)") !== null);

assert.ok(!isGrammaticalDictionaryFodder("thatd mary"));
assert.ok(!fodderHasContractionFragment("that army"));

const prepared = prepareAnagramClue({
  answer: "THAT ARMY",
  clue: "thatd, army in chaos (4,4)",
  anagramFodder: "that army",
});

assert.match(prepared.clue, /That'd/);
assert.ok(!/\bthatd\b/i.test(prepared.clue));

assert.ok(phraseAppearsAsFodderWords(prepared.clue, "that army"));

console.log("contraction tests passed");
