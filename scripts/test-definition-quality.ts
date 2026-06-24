import assert from "node:assert/strict";
import { verifyAnagramClue } from "../lib/anagram-engine";
import {
  isVagueDefinition,
  inspirationHasDefinitionSeeds,
  SEED_BACKED_INSPIRATION_THEMES,
  themeDefinitionSeeds,
  verifyDefinitionNotVague,
} from "../lib/definition-quality";

assert.ok(isVagueDefinition("A named figure"));
assert.ok(isVagueDefinition("A familiar name"));
assert.ok(!isVagueDefinition("A health-food infusion"));
assert.ok(!isVagueDefinition("An arcade combatant"));

assert.match(
  verifyDefinitionNotVague("A notable figure") ?? "",
  /too vague/i
);
assert.equal(verifyDefinitionNotVague("A grass-court victor"), null);

const teaDefs = themeDefinitionSeeds("herbal teas and infusions", "CAROB TEA");
assert.ok(teaDefs.length > 0);
assert.ok(teaDefs.some((d) => /infusion|teapot|steep/i.test(d)));
assert.ok(teaDefs.every((d) => !isVagueDefinition(d)));

const bondDefs = themeDefinitionSeeds("Bond villains", "GOLDFINGER");
assert.ok(bondDefs.some((d) => /spy|villain|adversary/i.test(d)));

const cyclingDefs = themeDefinitionSeeds(
  "Tour de France cycling legends",
  "PELOTON"
);
assert.ok(cyclingDefs.some((d) => /peloton|stage|grand tour|yellow/i.test(d)));
assert.ok(
  cyclingDefs[0] &&
    /peloton|stage|grand tour|yellow|breakaway/i.test(cyclingDefs[0]),
  "cycling sub-topic seeds should rank first"
);

const harryDefs = themeDefinitionSeeds("Harry Potter spells", "LUMOS");
assert.ok(harryDefs.some((d) => /spell|wand|magical|fantasy/i.test(d)));

for (const theme of SEED_BACKED_INSPIRATION_THEMES) {
  assert.ok(
    inspirationHasDefinitionSeeds(theme),
    `seed-backed theme should match a domain: ${theme}`
  );
  const seeds = themeDefinitionSeeds(theme, "SAMPLE ANSWER");
  assert.ok(seeds.length >= 4, `seed-backed theme should yield seeds: ${theme}`);
}

const vagueClue = verifyAnagramClue({
  answer: "JOHNNY CAGE",
  clue: "John, agency in chaos — a named figure (6,4)",
  anagramFodder: "agency john",
  anagramIndicator: "in chaos",
});
assert.ok(!vagueClue.ok);
assert.ok(vagueClue.errors.some((e) => /too vague/i.test(e)));

const themedClue = verifyAnagramClue({
  answer: "JOHNNY CAGE",
  clue: "John, agency in chaos — an arcade combatant (6,4)",
  anagramFodder: "agency john",
  anagramIndicator: "in chaos",
});
assert.ok(
  !themedClue.errors.some((e) => /too vague/i.test(e)),
  themedClue.errors.join("; ")
);

console.log("definition-quality tests passed");
