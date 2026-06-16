import assert from "node:assert/strict";
import { prepareAnagramClue, verifyAnagramClue } from "../lib/anagram-engine";
import { applyExplanationCapitalizationToClue } from "../lib/clue-capitalization-align";
import {
  canonicalCapitalForm,
  normalizeClueCapitalization,
  possessiveNameStem,
  requiresCapitalizationInClue,
  verifyClueCapitalizationRules,
} from "../lib/dictionary-proper-nouns";
import { verifyNoSuperfluousWords } from "../lib/clue-surface-tightness";

assert.equal(possessiveNameStem("jonahs"), "jonah");
assert.ok(requiresCapitalizationInClue("jonahs"));
assert.equal(canonicalCapitalForm("jonahs"), "Jonahs");

assert.equal(
  prepareAnagramClue({
    answer: "TEST",
    clue: "Prophet's place? jonahs town, oddly (4)",
    anagramFodder: "jonahs town",
    anagramIndicator: "oddly",
  }).clue,
  "Prophet's place? Jonahs town, oddly (4)"
);

assert.equal(
  applyExplanationCapitalizationToClue(
    "Prophet's place? jonahs town, oddly (4)",
    {
      definition: "Prophet's place?",
      wordplay: '"Jonahs town, oddly"',
      linkingWords: "none",
      walkthrough:
        'The definition is "Prophet\'s place?"; "Jonahs town, oddly" is the anagram wordplay.',
    }
  ),
  "Prophet's place? Jonahs town, oddly (4)"
);

assert.equal(
  normalizeClueCapitalization(
    "John, Agency In Chaos — A Roster Member (6,4)"
  ),
  "John, agency in chaos — a roster member (6,4)"
);

assert.equal(
  verifyClueCapitalizationRules(
    "John, agency in chaos — a roster member (6,4)"
  ),
  null
);

assert.match(
  verifyClueCapitalizationRules(
    "John, Agency in chaos — a roster member (6,4)"
  ) ?? "",
  /Agency.*agency/
);

assert.match(
  verifyNoSuperfluousWords(
    "Roster member as gaming icon: John, agency in chaos (6,4)",
    "agency john",
    "in chaos"
  ) ?? "",
  /Superfluous linking word "as"/
);

assert.equal(
  verifyNoSuperfluousWords(
    "John, agency in chaos — roster member (6,4)",
    "agency john",
    "in chaos"
  ),
  null
);

assert.match(
  verifyNoSuperfluousWords(
    "John, agency really in chaos — roster member (6,4)",
    "agency john",
    "in chaos"
  ) ?? "",
  /Superfluous word "really"/
);

const verified = verifyAnagramClue({
  answer: "JOHNNY CAGE",
  clue: "John, agency in chaos — a roster member (6,4)",
  anagramFodder: "agency john",
  anagramIndicator: "in chaos",
});

assert.ok(verified.ok, verified.errors.join("; "));

console.log("surface-quality tests passed");
