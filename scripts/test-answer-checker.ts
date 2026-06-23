import assert from "node:assert/strict";
import {
  answerCheckerWordLengths,
  checkAnswerLetters,
  emptyCheckerCells,
  emptyCheckerLocks,
  isAnswerComplete,
  nextEditableCellIndex,
  prevEditableCellIndex,
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

assert.equal(nextEditableCellIndex(2, checked.locked, lengths), 3);
assert.equal(nextEditableCellIndex(3, checked.locked, lengths), null);
assert.equal(nextEditableCellIndex(5, checked.locked, lengths), null);
assert.equal(nextEditableCellIndex(6, checked.locked, lengths), 7);
assert.equal(nextEditableCellIndex(9, checked.locked, lengths), null);
assert.equal(prevEditableCellIndex(7, checked.locked, lengths), 6);
assert.equal(prevEditableCellIndex(3, checked.locked, lengths), null);

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
