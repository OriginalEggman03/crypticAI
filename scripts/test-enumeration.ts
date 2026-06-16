import assert from "node:assert/strict";
import {
  capitalizeClueStart,
  fixEnumerationInClue,
  verifyEnumeration,
} from "../lib/clue-verify";
import { prepareAnagramClue } from "../lib/anagram-engine";

const fixed = fixEnumerationInClue("Hero returns in film (7)", "MEGAMIND");
console.log("fixed:", fixed);
console.log(
  "verify:",
  verifyEnumeration(fixed, "MEGAMIND") ?? "ok"
);

assert.equal(
  capitalizeClueStart("a roster member: john, agency in chaos (6,4)"),
  "A roster member: john, agency in chaos (6,4)"
);

const prepared = prepareAnagramClue({
  answer: "JOHNNY CAGE",
  clue: "john, agency in chaos — a roster member (6,4)",
  anagramFodder: "agency john",
});
if (!/^J/.test(prepared.clue)) {
  throw new Error(`expected capitalised clue start, got: ${prepared.clue}`);
}

console.log("capitalise start: ok");
