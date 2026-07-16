import { loadEnvLocal } from "@/lib/load-env-local";
import {
  hintsFromDefinition,
  homophoneHintPhrases,
  isCooccurringModifierHint,
  isGenericPartOfSpeechHint,
  isSubstitutableHomophoneHint,
} from "@/lib/homophone-definitions";
import { getHomophoneSynonyms, getStoredHomophoneDefinition } from "@/lib/db/homophones";
import { buildProgrammaticHomophoneClue } from "@/lib/homophone-surface";
import { verifyHomophoneClue } from "@/lib/homophone-engine";
import { isDistinctHomophonePair } from "@/lib/homophone-variants";

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

assert(
  isGenericPartOfSpeechHint("A common verb"),
  "detects generic verb hint"
);
assert(
  isGenericPartOfSpeechHint("A common noun"),
  "detects generic noun hint"
);
assert(
  !isGenericPartOfSpeechHint("Horse-drawn cab"),
  "allows specific hint"
);

const boarDefinition =
  "A wild boar (Sus scrofa), the wild ancestor of the domesticated pig.";
const boarHints = hintsFromDefinition(boarDefinition, "boar");
assert(
  !boarHints.some((hint) => /^wild$/i.test(hint)),
  "boar hints exclude modifier-only wild"
);
assert(
  boarHints.every((hint) =>
    isSubstitutableHomophoneHint(hint, "boar", boarDefinition)
  ),
  "all boar definition hints are substitutable"
);
assert(
  isCooccurringModifierHint("wild", "boar", boarDefinition),
  "detects wild as modifier of boar"
);
assert(
  !isSubstitutableHomophoneHint("wild", "boar", boarDefinition),
  "rejects wild as boar hint"
);
assert(
  isSubstitutableHomophoneHint("pig", "boar"),
  "allows pig as boar hint"
);
assert(
  isSubstitutableHomophoneHint("swine", "boar"),
  "allows swine as boar hint"
);
assert(
  isSubstitutableHomophoneHint("hog", "boar"),
  "allows hog as boar hint"
);

const handsomeStored = getStoredHomophoneDefinition("handsome");
const hansomStored = getStoredHomophoneDefinition("hansom");
assert(Boolean(handsomeStored?.definition), "handsome has stored pair definition");
assert(Boolean(hansomStored?.definition), "hansom has stored pair definition");

if (handsomeStored?.definition) {
  const hints = hintsFromDefinition(handsomeStored.definition, "handsome");
  assert(hints.length > 0, "handsome definition yields usable hints");
  assert(
    hints.every((hint) => !isGenericPartOfSpeechHint(hint)),
    "handsome hints are not generic POS placeholders"
  );
  assert(
    hints.every((hint) => !/\bhandsome\b/i.test(hint)),
    "handsome hints omit the answer word"
  );
}

if (hansomStored?.definition) {
  const hints = hintsFromDefinition(hansomStored.definition, "hansom");
  assert(hints.length > 0, "hansom definition yields usable hints");
  assert(
    hints.some((hint) => /cab|carriage/i.test(hint)),
    "hansom hints include cab/carriage sense"
  );
}

assert(
  isDistinctHomophonePair("handsome", "hansom"),
  "handsome/hansom are distinct homophones"
);
assert(
  !isDistinctHomophonePair("handsome", "handsome"),
  "identical spellings are not distinct"
);

async function checkPairClue(): Promise<void> {
  const answerHints = await homophoneHintPhrases("handsome");
  const fodderHints = await homophoneHintPhrases("hansom");
  assert(answerHints.length > 0, "handsome has hint phrases");
  assert(fodderHints.length > 0, "hansom has hint phrases");
  assert(
    answerHints.every((hint) => !isGenericPartOfSpeechHint(hint)),
    "handsome hint phrases exclude generic POS"
  );
  assert(
    fodderHints.every((hint) => !isGenericPartOfSpeechHint(hint)),
    "hansom hint phrases exclude generic POS"
  );

  const boarStored = getStoredHomophoneDefinition("boar");
  if (boarStored?.definition) {
    const boarPhrases = await homophoneHintPhrases("boar");
    assert(
      !boarPhrases.some((hint) => /^wild$/i.test(hint)),
      "boar hint phrases exclude wild modifier"
    );
    assert(
      boarPhrases.some((hint) => /pig|swine|hog/i.test(hint)),
      "boar hint phrases include pig/swine/hog"
    );
  }

  const draft = buildProgrammaticHomophoneClue(
    {
      answer: "HANDSOME",
      fodder: "hansom",
      themeScore: 0,
      isPhrase: false,
      isMultiWordAnswer: false,
    },
    { answerHints, fodderHints, shuffleSeed: "handsome-hansom-test" }
  );
  assert(Boolean(draft), "builds verified handsome/hansom clue");
  if (draft) {
    const verification = verifyHomophoneClue(draft);
    assert(verification.ok, "handsome/hansom clue passes verification");
    assert(
      !/A common (verb|noun)\b/i.test(draft.clue),
      "clue surface has no generic POS hints"
    );
    console.log("Sample clue:", draft.clue);
  }
}

checkPairClue()
  .then(() => {
    if (failed > 0) process.exit(1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
