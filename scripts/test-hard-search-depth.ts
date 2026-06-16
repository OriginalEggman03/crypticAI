import assert from "node:assert/strict";
import { answerLengthBounds } from "../lib/anagram-difficulty";
import { defaultMaxAnswersToProcess } from "../lib/anagram-dictionary";

const easy = answerLengthBounds("easy");
const hard = answerLengthBounds("hard");

assert.ok(defaultMaxAnswersToProcess(hard) >= defaultMaxAnswersToProcess(easy));
assert.ok(defaultMaxAnswersToProcess(hard, 5) > defaultMaxAnswersToProcess(hard, 0));
assert.equal(defaultMaxAnswersToProcess(hard, 0), 56);
assert.equal(defaultMaxAnswersToProcess(easy, 0), 36);

console.log("hard search depth tests passed");
