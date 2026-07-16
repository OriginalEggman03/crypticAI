import { loadEnvLocal } from "@/lib/load-env-local";
import { answerLengthBounds } from "@/lib/anagram-difficulty";
import { ensureHomophoneDatabase, ensureHomophoneSynonyms } from "@/lib/db/homophones";
import { generateVerifiedHomophoneClue } from "@/lib/homophone-pipeline";
import { buildProgrammaticHomophoneClue } from "@/lib/homophone-surface";
import { homophoneHintPhrases } from "@/lib/homophone-definitions";
import {
  findAnyHomophonePair,
  listCandidateHomophonePairs,
  pairsForAnswer,
} from "@/lib/homophone-dictionary";

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

async function main() {
  await ensureHomophoneDatabase();
  await ensureHomophoneSynonyms();

  const answerArg = process.argv[2]?.trim();
  const bounds = answerLengthBounds("easy");

  const pairs = answerArg
    ? pairsForAnswer(answerArg).slice(0, 3)
    : listCandidateHomophonePairs(bounds, 3).length > 0
      ? listCandidateHomophonePairs(bounds, 3)
      : (() => {
          const fallback = findAnyHomophonePair(bounds);
          return fallback ? [fallback] : [];
        })();

  if (pairs.length === 0) {
    console.error(
      "No homophone pairs found.",
      answerArg
        ? "Try a different answer word (e.g. STEAK, MEAT, FLOUR)."
        : "Homophone database may be empty — run npm run build:homophones."
    );
    process.exit(1);
  }

  for (const pair of pairs) {
    const answerHints = await homophoneHintPhrases(pair.answer);
    const fodderHints = await homophoneHintPhrases(pair.fodder);
    const draft = buildProgrammaticHomophoneClue(pair, { answerHints, fodderHints });
    console.log("Pair:", pair.answer, "<-", pair.fodder);
    console.log("Programmatic:", draft?.clue ?? "(no verified clue)");
    console.log("---");
  }

  const programmaticOnly = await generateVerifiedHomophoneClue(null, {}, { skipLlm: true });

  assert(
  !("error" in programmaticOnly),
    "programmatic fallback generates without API key"
  );
  if (!("error" in programmaticOnly)) {
    assert(
      programmaticOnly.strategy === "homophone-programmatic",
      "fallback uses homophone-programmatic strategy"
    );
    assert(programmaticOnly.llmCalls === 0, "fallback records zero llmCalls");
    console.log("Fallback clue:", programmaticOnly.clue.clue);
  }

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
