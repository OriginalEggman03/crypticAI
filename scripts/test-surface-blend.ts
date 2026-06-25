import assert from "node:assert/strict";
import {
  blendSurfaceScore,
  detectBoundaryTelegraph,
} from "../lib/clue-surface-blend";

const fodder = "agency john";
const indicator = "in chaos";

assert.ok(
  detectBoundaryTelegraph(
    "An arcade combatant, John agency in chaos (6,4)",
    fodder,
    indicator
  ).telegraphs
);

assert.ok(
  !detectBoundaryTelegraph(
    "Perhaps John agency in chaos for an arcade combatant (6,4)",
    fodder,
    indicator
  ).telegraphs
);

assert.ok(
  !detectBoundaryTelegraph(
    "That'd army, in chaos for a gaming plumber (5)",
    "that army",
    "in chaos"
  ).telegraphs,
  "commas between fodder words should not telegraph"
);

assert.ok(
  blendSurfaceScore(
    "An arcade combatant, John agency in chaos (6,4)",
    fodder,
    indicator
  ) < 0
);

assert.ok(
  blendSurfaceScore(
    "Perhaps John agency in chaos for an arcade combatant (6,4)",
    fodder,
    indicator
  ) > 0
);

console.log("surface-blend tests passed");
