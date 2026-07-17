import assert from "node:assert/strict";
import {
  hasOffensiveHomophoneDefinition,
  isBlockedHomophoneWord,
  isContentSafeHomophonePair,
} from "@/lib/homophone-content-filter";
import { isDistinctHomophonePair } from "@/lib/homophone-variants";

assert(isBlockedHomophoneWord("dyke"), "dyke blocked");
assert(isBlockedHomophoneWord("Dyke"), "Dyke blocked case-insensitive");
assert(isBlockedHomophoneWord("cock"), "cock blocked");
assert(isBlockedHomophoneWord("damn"), "damn blocked");
assert(!isBlockedHomophoneWord("dike"), "dike embankment spelling not word-blocked");
assert(!isBlockedHomophoneWord("meat"), "meat allowed");

assert(
  hasOffensiveHomophoneDefinition(
    "(usually derogatory) A lesbian, particularly one with masculine or butch traits or behavior."
  ),
  "derogatory sense flagged"
);
assert(
  !hasOffensiveHomophoneDefinition("A solid or hollow sphere, or roughly spherical mass."),
  "neutral definition allowed"
);

assert(
  !isContentSafeHomophonePair(
    "dike",
    "dyke",
    "Alternative form of dyke: to dig a ditch.",
    "(usually derogatory) A lesbian, particularly one with masculine or butch traits or behavior."
  ),
  "dike/dyke rejected"
);
assert(
  !isContentSafeHomophonePair("caulk", "cock", "Sealant.", "A male bird."),
  "caulk/cock rejected"
);
assert(
  isContentSafeHomophonePair(
    "meat",
    "meet",
    "Animal flesh used as food.",
    "To come together."
  ),
  "meat/meet allowed"
);

assert(!isDistinctHomophonePair("dike", "dyke"), "dike/dyke not distinct (blocked)");
assert(!isDistinctHomophonePair("caulk", "cock"), "caulk/cock not distinct (blocked)");
assert(isDistinctHomophonePair("meat", "meet"), "meat/meet still distinct");

console.log("test-homophone-content-filter: ok");
