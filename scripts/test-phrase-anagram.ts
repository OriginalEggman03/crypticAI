import { answerLengthBounds } from "../lib/anagram-difficulty";
import {
  findFodderCandidates,
  findPhraseFodderCandidates,
  listCandidatePairs,
} from "../lib/anagram-dictionary";

const answers = ["RISTRETTO", "THING", "NIGHT", "HERO"];

for (const answer of answers) {
  const singles = findFodderCandidates(answer);
  const phrases = findPhraseFodderCandidates(answer, 8);
  console.log(`\n${answer}`);
  console.log(`  singles (${singles.length}):`, singles.slice(0, 6).join(", "));
  console.log(`  phrases (${phrases.length}):`, phrases.slice(0, 5).join(" | "));
}

const easyBounds = answerLengthBounds("easy");

console.log("\n--- themed pairs: jazz, coffee ---");
for (const p of listCandidatePairs("jazz, coffee", easyBounds, 8)) {
  console.log(
    `  ${p.answer} / "${p.fodder}"${p.isPhrase ? " [phrase]" : ""} score=${p.themeScore}`
  );
}
