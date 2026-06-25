import assert from "node:assert/strict";
import { prepareAnagramClue, verifyAnagramClue } from "../lib/anagram-engine";
import { applyExplanationCapitalizationToClue } from "../lib/clue-capitalization-align";
import {
  canonicalCapitalForm,
  normalizeClueCapitalization,
  possessiveNameStem,
  requiresCapitalizationInClue,
  resetDictionaryProperNounCache,
  verifyClueCapitalizationRules,
} from "../lib/dictionary-proper-nouns";
import { verifyDefinitionMatchesAnswer } from "../lib/definition-quality";
import { verifyNoSuperfluousWords } from "../lib/clue-surface-tightness";

assert.equal(possessiveNameStem("jonahs"), "jonah");
assert.ok(requiresCapitalizationInClue("jonahs"));
assert.equal(canonicalCapitalForm("jonahs"), "Jonahs");

resetDictionaryProperNounCache();
assert.ok(!requiresCapitalizationInClue("rather"));
assert.equal(
  normalizeClueCapitalization(
    "Mug of carob tea rather odd for a health-food infusion (4,3)"
  ),
  "Mug of carob tea rather odd for a health-food infusion (4,3)"
);
assert.match(
  verifyClueCapitalizationRules(
    "Mug of carob tea Rather odd for a health-food infusion (4,3)"
  ) ?? "",
  /Rather.*rather/i
);
assert.match(
  prepareAnagramClue({
    answer: "CAROB TEA",
    clue: "Mug of carob tea Rather odd for a health-food infusion (5,3)",
    anagramFodder: "mug carob tea rather",
    anagramIndicator: "odd",
  }).clue,
  /rather odd/i
);
assert.doesNotMatch(
  prepareAnagramClue({
    answer: "CAROB TEA",
    clue: "Mug of carob tea Rather odd for a health-food infusion (5,3)",
    anagramFodder: "mug carob tea rather",
    anagramIndicator: "odd",
  }).clue,
  /\bRather\b/
);

assert.equal(
  prepareAnagramClue({
    answer: "TEST",
    clue: "Prophet's place? jonahs town oddly (4)",
    anagramFodder: "jonahs town",
    anagramIndicator: "oddly",
  }).clue,
  "Prophet's place? Jonahs town oddly (4)"
);

assert.equal(
  applyExplanationCapitalizationToClue(
    "Prophet's place? jonahs town oddly (4)",
    {
      definition: "Prophet's place?",
      wordplay: '"Jonahs town oddly"',
      linkingWords: "none",
      walkthrough:
        'The definition is "Prophet\'s place?"; "Jonahs town oddly" is the anagram wordplay.',
    }
  ),
  "Prophet's place? Jonahs town oddly (4)"
);

assert.equal(
  normalizeClueCapitalization(
    "Lost at sea? help me john agency in chaos for a roster member (6,4)"
  ),
  "Lost at sea? Help me John agency in chaos for a roster member (6,4)"
);

assert.equal(
  verifyClueCapitalizationRules(
    "Lost at sea? Help me John agency in chaos for a roster member (6,4)"
  ),
  null
);

assert.match(
  verifyClueCapitalizationRules(
    "Lost at sea? help me john agency in chaos for a roster member (6,4)"
  ) ?? "",
  /help.*Help/
);

assert.match(
  verifyNoSuperfluousWords(
    "Roster member as gaming icon John agency in chaos (6,4)",
    "agency john",
    "in chaos"
  ) ?? "",
  /Superfluous linking word "as"/
);

assert.equal(
  verifyNoSuperfluousWords(
    "Perhaps John agency in chaos for roster member (6,4)",
    "agency john",
    "in chaos"
  ),
  null
);

assert.match(
  verifyNoSuperfluousWords(
    "John agency really in chaos for roster member (6,4)",
    "agency john",
    "in chaos"
  ) ?? "",
  /Superfluous word "really"/
);

assert.match(
  verifyNoSuperfluousWords(
    "Lost at sea? Help me sham needs sorting for a warming winter pudding (4)",
    "sham",
    "needs sorting"
  ) ?? "",
  /Stray padding/i
);

assert.match(
  verifyDefinitionMatchesAnswer("a warming winter pudding", "MASH") ?? "",
  /misdescribes|savoury/i
);

const verified = verifyAnagramClue({
  answer: "JOHNNY CAGE",
  clue: "Arcade combatant where John agency in chaos (6,4)",
  anagramFodder: "agency john",
  anagramIndicator: "in chaos",
});

assert.ok(verified.ok, verified.errors.join("; "));

console.log("surface-quality tests passed");
