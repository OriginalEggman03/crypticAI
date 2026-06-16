import assert from "node:assert/strict";
import { answerLengthBounds } from "../lib/anagram-difficulty";
import { listCandidatePairs } from "../lib/anagram-dictionary";
import {
  filterExcludedPairs,
  isAnswerExcluded,
  usedAnswersFromClues,
} from "../lib/clue-history";

const inspiration = "Mortal Kombat characters";
const bounds = answerLengthBounds("easy");
const suggested = [
  "RAIDEN",
  "SCORPION",
  "KANO",
  "JOHNNY CAGE",
  "LIU KANG",
  "SONYA",
  "KITANA",
];

const pool = listCandidatePairs(inspiration, bounds, 56, {
  suggestedAnswers: suggested,
  dictionaryScanLimit: 120,
});
const uniqueAnswers = [...new Set(pool.map((p) => p.answer))];

assert.ok(pool.length > 0, "expected themed pairs with Claude-style suggestions");
assert.ok(uniqueAnswers.length >= 3, "expected several unique themed answers");

const used = uniqueAnswers.slice(0, 3).map((answer) => {
  const pair = pool.find((p) => p.answer === answer)!;
  return {
    answer: pair.answer,
    anagramFodder: pair.fodder,
    clue: "test clue",
  };
});

const excluded = usedAnswersFromClues(used);
assert.equal(excluded.length, 3);

const retryPool = filterExcludedPairs(
  listCandidatePairs(inspiration, bounds, 96, {
    suggestedAnswers: suggested,
    excludeAnswers: excluded,
    dictionaryScanLimit: 220,
  }),
  used
);

assert.ok(
  !retryPool.some((p) => isAnswerExcluded(p.answer, used)),
  "retry pool must not contain excluded answers"
);

const sameAnswerNewFodder = pool.find(
  (p) =>
    p.answer === used[0].answer &&
    p.fodder.toLowerCase() !== used[0].anagramFodder
);

if (sameAnswerNewFodder) {
  assert.ok(
    !retryPool.some((p) => p.answer === sameAnswerNewFodder.answer),
    "same answer with new fodder must still be excluded"
  );
}

console.log(
  `retry-pairs: ${uniqueAnswers.length} answers, ${retryPool.length} after answer exclude`
);
