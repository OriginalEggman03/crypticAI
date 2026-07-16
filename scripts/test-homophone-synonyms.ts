import { loadEnvLocal } from "@/lib/load-env-local";
import {
  ensureHomophoneDatabase,
  getHomophoneSynonyms,
  getStoredHomophoneDefinition,
  rebuildHomophoneSynonyms,
} from "@/lib/db/homophones";
import {
  gatherHomophoneSynonymsLocal,
} from "@/lib/homophone-synonym-populate";
import { getCuratedHomophoneHints } from "@/lib/homophone-synonyms";
import { isSubstitutableHomophoneHint } from "@/lib/homophone-definitions";

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
  const stats = await rebuildHomophoneSynonyms({ fetchRemote: false });
  console.log(`Rebuilt ${stats.words} synonym rows (local sources only).`);

  const cashSynonyms = getHomophoneSynonyms("cash");
  assert(cashSynonyms.length > 0, "cash has stored synonyms");
  assert(
    cashSynonyms.some((s) => /bread|dough|money/i.test(s)),
    "cash synonyms include curated money hints"
  );

  const cacheSynonyms = getHomophoneSynonyms("cache");
  assert(cacheSynonyms.length > 0, "cache has stored synonyms");
  assert(
    cacheSynonyms.some((s) => /bin|store|hoard|stash/i.test(s)),
    "cache synonyms include curated store hints"
  );

  const localCash = gatherHomophoneSynonymsLocal("cash");
  assert(localCash.length > 0, "local gather returns cash synonyms");
  assert(
    getCuratedHomophoneHints("cash").every((hint) =>
      localCash.some((s) => s.toLowerCase() === hint.toLowerCase())
    ),
    "local gather includes all curated cash hints"
  );

  for (const word of ["cash", "cache", "meat", "meet"]) {
    const synonyms = getHomophoneSynonyms(word);
    assert(
      synonyms.every((s) => !new RegExp(`\\b${word}\\b`, "i").test(s)),
      `${word} synonyms omit literal word`
    );
  }

  const boarStoredDefinition = getStoredHomophoneDefinition("boar")?.definition;
  const boarSynonyms = getHomophoneSynonyms("boar");
  assert(boarSynonyms.length > 0, "boar has stored synonyms");
  assert(
    !boarSynonyms.some((s) => /^wild$/i.test(s)),
    "boar synonyms exclude wild modifier"
  );
  assert(
    boarSynonyms.every((s) =>
      isSubstitutableHomophoneHint(s, "boar", boarStoredDefinition)
    ),
    "boar synonyms are substitutable hints"
  );
  assert(
    boarSynonyms.some((s) => /pig|swine|hog/i.test(s)),
    "boar synonyms include pig/swine/hog"
  );
  assert(
    getCuratedHomophoneHints("boar").some((hint) => /pig|swine|hog/i.test(hint)),
    "boar has curated pig/swine/hog hints"
  );

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
