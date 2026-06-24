import assert from "node:assert/strict";
import { phraseAppearsAsFodderWords } from "../lib/fodder-surface";
import { linkingWordCount } from "../lib/clue-surface-link";
import { verifyAnagramClue } from "../lib/anagram-engine";

assert.ok(
  phraseAppearsAsFodderWords(
    "John agency in chaos (6,4)",
    "agency john"
  )
);

assert.ok(
  !phraseAppearsAsFodderWords(
    "John, agency in chaos (6,4)",
    "agency john"
  )
);

assert.ok(
  !phraseAppearsAsFodderWords(
    "Agency from John in chaos (6,4)",
    "agency john"
  )
);

assert.equal(
  linkingWordCount("A roster member where John agency in chaos (6,4)", "agency john"),
  1
);

const verified = verifyAnagramClue({
  answer: "JOHNNY CAGE",
  clue: "Arcade combatant where John agency in chaos (6,4)",
  anagramFodder: "agency john",
  anagramIndicator: "in chaos",
});

assert.ok(verified.ok, verified.errors.join("; "));

console.log("fodder-surface tests passed");
