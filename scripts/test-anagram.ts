import {
  anagramMismatchReason,
  isAnagramOf,
} from "../lib/clue-verify";

function assert(label: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${label}`);
  }
}

assert("8-letter fodder vs 9-letter answer", !isAnagramOf("gaming demo", "MEGAMIND"));
assert("wrong 8-letter multiset", !isAnagramOf("Damning game", "MEGAMIND"));
assert("valid anagram", isAnagramOf("listen", "SILENT"));
assert("duplicate O required", isAnagramOf("NOON", "NONO"));
assert("cannot reuse O", !isAnagramOf("NOON", "NOOO"));
assert("cannot add extra N", !isAnagramOf("ROON", "ROONN"));

const mismatch = anagramMismatchReason("gaming demo", "MEGAMIND");
assert(
  "reports length mismatch",
  mismatch?.includes("8") === true && mismatch?.includes("10") === true
);

const dupMismatch = anagramMismatchReason("ROON", "ROONN");
assert(
  "reports duplicate letter mismatch",
  dupMismatch?.includes("N") === true || dupMismatch?.includes("9") === true
);

if (process.exitCode) {
  console.error("\nSome anagram tests failed.");
} else {
  console.log("\nAll anagram tests passed.");
}
