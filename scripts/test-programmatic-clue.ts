import { answerLengthBounds } from "../lib/anagram-difficulty";
import { listCandidatePairs } from "../lib/anagram-dictionary";
import { buildProgrammaticClue } from "../lib/anagram-fallback-clue";

const inspirations = [
  "jazz, coffee",
  "Marvel, hero",
  "xyz obscure qwerty",
  "gardening, roses",
];

const easyBounds = answerLengthBounds("easy");

for (const inspiration of inspirations) {
  const pairs = listCandidatePairs(inspiration, easyBounds, 8);
  let clue = null;
  for (const pair of pairs) {
    clue = buildProgrammaticClue(pair, inspiration);
    if (clue) break;
  }
  console.log(
    inspiration,
    clue ? `OK ${clue.answer} — ${clue.clue}` : `FAIL (${pairs.length} pairs)`
  );
}
