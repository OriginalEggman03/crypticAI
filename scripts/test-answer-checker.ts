import assert from "node:assert/strict";
import {
  answerCheckerWordLengths,
  checkAnswerLetters,
  emptyCheckerCells,
  emptyCheckerLocks,
  isAnswerComplete,
  revealAnswerLetters,
} from "../lib/answer-checker";

const clue = "Chaos in a jolly cage for fighter (6,4)";
const answer = "JOHNNY CAGE";

const lengths = answerCheckerWordLengths(clue, answer);
assert.deepEqual(lengths, [6, 4]);

const initial = {
  cells: emptyCheckerCells(lengths),
  locked: emptyCheckerLocks(lengths),
};
assert.equal(initial.cells.length, 10);

const partial = {
  cells: ["J", "O", "H", "X", "N", "Y", "", "", "", ""],
  locked: emptyCheckerLocks(lengths),
};
const checked = checkAnswerLetters(partial, answer);
assert.deepEqual(checked.cells, ["J", "O", "H", "", "N", "Y", "", "", "", ""]);
assert.deepEqual(checked.locked, [true, true, true, false, true, true, false, false, false, false]);

const complete = checkAnswerLetters(
  {
    cells: "JOHNNY CAGE".replace(/\s/g, "").split(""),
    locked: emptyCheckerLocks(lengths),
  },
  answer
);
assert.ok(isAnswerComplete(complete, answer));

const revealed = revealAnswerLetters(lengths, answer);
assert.deepEqual(revealed.cells, "JOHNNYCAGE".split(""));
assert.ok(revealed.locked.every(Boolean));
assert.ok(isAnswerComplete(revealed, answer));

console.log("answer-checker tests passed");
