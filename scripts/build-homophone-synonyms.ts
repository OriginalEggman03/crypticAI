import { loadEnvLocal } from "@/lib/load-env-local";
import {
  ensureHomophoneDatabase,
  getHomophoneStats,
  rebuildHomophoneSynonyms,
} from "@/lib/db/homophones";

loadEnvLocal();

async function main() {
  await ensureHomophoneDatabase();
  const fetchRemote = process.argv.includes("--remote");
  const stats = await rebuildHomophoneSynonyms({ fetchRemote });
  const dbStats = getHomophoneStats();
  console.log(
    `Homophone synonyms rebuilt: ${stats.words} words with synonyms (${dbStats.words} lexicon words, ${dbStats.pairs} pairs).`
  );
  if (!fetchRemote) {
    console.log("Used local/curated sources only. Pass --remote to fetch dictionary API glosses.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
