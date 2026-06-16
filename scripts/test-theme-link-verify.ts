import assert from "node:assert/strict";
import { verifyAnswerThematicLink } from "../lib/theme-link-quality";
import { verifyAnagramClue } from "../lib/anagram-engine";

const inspiration = "Mortal Kombat characters";
const suggested = ["RAIDEN", "SCORPION", "JOHNNY CAGE", "LIU KANG"];

assert.ok(
  verifyAnswerThematicLink("SCORPION", inspiration, { suggestedAnswers: suggested }) ===
    null
);

assert.ok(
  verifyAnswerThematicLink("RAIDEN", inspiration, { suggestedAnswers: suggested }) ===
    null
);

assert.ok(
  verifyAnswerThematicLink("MORTAL", inspiration, { suggestedAnswers: suggested }) !==
    null
);

assert.ok(
  verifyAnswerThematicLink("TABLE", inspiration, { suggestedAnswers: suggested }) !==
    null
);

assert.ok(
  verifyAnswerThematicLink("CHARM", inspiration, { suggestedAnswers: suggested }) !==
    null
);

assert.ok(
  verifyAnswerThematicLink("BADMAN", inspiration, { suggestedAnswers: suggested }) !==
    null
);

const themed = verifyAnagramClue(
  {
    answer: "SCORPION",
    clue: "Venomous fighter oddly broken (8)",
    anagramFodder: "poison rc",
  },
  { inspiration, suggestedAnswers: suggested }
);
assert.ok(
  themed.checks.some((c) => c.name === "theme link" && c.pass),
  "themed answer should pass theme link check"
);

const unthemed = verifyAnagramClue(
  {
    answer: "CHARM",
    clue: "Appeal oddly broken (5)",
    anagramFodder: "march",
  },
  { inspiration, suggestedAnswers: suggested }
);
assert.ok(
  unthemed.checks.some((c) => c.name === "theme link" && !c.pass),
  "unrelated answer should fail theme link check"
);
assert.ok(!unthemed.ok);

console.log("theme link verification tests passed");
