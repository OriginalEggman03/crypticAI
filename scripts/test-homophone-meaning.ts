import {
  areInflectionalVariants,
  definitionGlossesOverlap,
  haveSameCurrencyCoinSense,
  isNamedCurrencyOrCoinGloss,
  lemmaKey,
  normalizeDefinitionGloss,
} from "@/lib/homophone-meaning";
import {
  areSpellingVariants,
  haveSameMeaning,
  isDistinctHomophonePair,
} from "@/lib/homophone-variants";

let failed = 0;

function assert(condition: boolean, label: string): void {
  if (!condition) {
    failed++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`OK   ${label}`);
  }
}

assert(areInflectionalVariants("tableau", "tableaux"), "tableau/tableaux inflectional");
assert(!isDistinctHomophonePair("tableau", "tableaux"), "tableau/tableaux not distinct");
assert(isDistinctHomophonePair("meat", "meet"), "meat/meet distinct");
assert(isDistinctHomophonePair("steak", "stake"), "steak/stake distinct");
assert(isDistinctHomophonePair("kernel", "colonel"), "kernel/colonel distinct");
assert(!areInflectionalVariants("berths", "births"), "berths/births not inflectional");
assert(lemmaKey("tableaux") === "tableau", "lemma tableaux -> tableau");
assert(
  definitionGlossesOverlap(
    "a striking and vivid representation",
    "a striking and vivid representation"
  ),
  "identical gloss overlap"
);
assert(
  haveSameMeaning("tableau", "tableaux"),
  "haveSameMeaning tableau/tableaux"
);
assert(!haveSameMeaning("meat", "meet"), "haveSameMeaning rejects meat/meet");
assert(
  haveSameCurrencyCoinSense("schilling", "shilling"),
  "haveSameCurrencyCoinSense schilling/shilling"
);
assert(
  !isDistinctHomophonePair("schilling", "shilling"),
  "schilling/shilling not distinct homophones"
);
assert(
  haveSameMeaning("schilling", "shilling"),
  "haveSameMeaning schilling/shilling"
);
assert(
  isNamedCurrencyOrCoinGloss("old currency of austria"),
  "named currency gloss schilling"
);
assert(
  isNamedCurrencyOrCoinGloss("coin formerly used in the united kingdom"),
  "named currency gloss shilling"
);
assert(
  !haveSameMeaning("cent", "sent"),
  "haveSameMeaning keeps cent/sent"
);
assert(
  isDistinctHomophonePair("cent", "sent"),
  "cent/sent still distinct homophones"
);
assert(
  haveSameCurrencyCoinSense("krona", "krone"),
  "haveSameCurrencyCoinSense krona/krone"
);
assert(
  !isDistinctHomophonePair("krona", "krone"),
  "krona/krone not distinct homophones"
);
assert(
  normalizeDefinitionGloss("A striking and vivid representation.") ===
    "striking and vivid representation",
  "normalize gloss strips article"
);

const usUkVariants: Array<[string, string]> = [
  ["practice", "practise"],
  ["license", "licence"],
  ["defense", "defence"],
  ["organize", "organise"],
  ["color", "colour"],
  ["center", "centre"],
  ["analyze", "analyse"],
  ["offense", "offence"],
  ["fiber", "fibre"],
  ["theater", "theatre"],
];
for (const [us, uk] of usUkVariants) {
  assert(areSpellingVariants(us, uk), `spelling variant ${us}/${uk}`);
  assert(haveSameMeaning(us, uk), `haveSameMeaning ${us}/${uk}`);
  assert(!isDistinctHomophonePair(us, uk), `not distinct homophone ${us}/${uk}`);
}

const diacriticVariants: Array<[string, string]> = [
  ["cafe", "café"],
  ["resume", "résumé"],
  ["naive", "naïve"],
  ["cliche", "cliché"],
  ["facade", "façade"],
];
for (const [plain, accented] of diacriticVariants) {
  assert(areSpellingVariants(plain, accented), `diacritic variant ${plain}/${accented}`);
  assert(haveSameMeaning(plain, accented), `haveSameMeaning ${plain}/${accented}`);
  assert(
    !isDistinctHomophonePair(plain, accented),
    `not distinct homophone ${plain}/${accented}`
  );
}

const loanwordVariants: Array<[string, string]> = [
  ["cream", "creme"],
  ["creme", "crème"],
];
for (const [a, b] of loanwordVariants) {
  assert(areSpellingVariants(a, b), `loanword variant ${a}/${b}`);
  assert(haveSameMeaning(a, b), `haveSameMeaning ${a}/${b}`);
  assert(!isDistinctHomophonePair(a, b), `not distinct homophone ${a}/${b}`);
}

assert(isDistinctHomophonePair("meat", "meet"), "meat/meet still distinct after ea rule");
assert(isDistinctHomophonePair("sea", "see"), "sea/see still distinct after ea rule");
assert(isDistinctHomophonePair("steak", "stake"), "steak/stake still distinct");
assert(
  !isDistinctHomophonePair("populace", "populous"),
  "populace/populous rejected (related cognate senses)"
);

if (failed > 0) process.exit(1);
