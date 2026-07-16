import { loadEnvLocal } from "@/lib/load-env-local";

import { getHomophonePartners, getHomophoneStats } from "@/lib/db/homophones";
import {
  haveIdenticalSpelling,
  isDistinctHomophonePair,
} from "@/lib/homophone-variants";
import { runHomophonePairsIntegrityCheck } from "./test-homophone-pairs-integrity";

loadEnvLocal();

let failed = 0;

function assert(condition: boolean, label: string): void {
  if (!condition) {
    failed++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`OK   ${label}`);
  }
}

assert(!isDistinctHomophonePair("shilling", "shilling"), "shilling/shilling rejected");
assert(haveIdenticalSpelling("Shilling", "shilling"), "Shilling/shilling are identical spellings");
assert(!isDistinctHomophonePair("schilling", "shilling"), "schilling/shilling rejected (same currency sense)");
assert(
  !getHomophonePartners("schilling").includes("shilling") &&
    !getHomophonePartners("shilling").includes("schilling"),
  "schilling/shilling not paired in DB"
);
assert(
  !getHomophonePartners("bally").includes("bailey") &&
    !getHomophonePartners("bailey").includes("bally"),
  "bally/bailey not paired (AE vs EY primary vowels)"
);

const stats = getHomophoneStats();

console.log(`Homophone DB: ${stats.pairs} pairs, ${stats.words} words.`);



for (const word of [

  "kernel",

  "colonel",

  "meat",

  "meet",

  "steak",

  "stake",

  "thyme",

  "time",

  "breeding",

  "breathing",

  "bladder",

  "blather",

  "too",

  "to",

  "two",

  "write",

  "right",

  "allowed",

  "aloud",

  "gauntlet",

  "gantlet",

]) {

  const partners = getHomophonePartners(word);

  console.log(

    `${word}: ${partners.length ? partners.slice(0, 12).join(", ") : "(none)"}`

  );

}

console.log("\nRunning homophone pair integrity checks...");
failed += runHomophonePairsIntegrityCheck();

if (failed > 0) process.exit(1);
