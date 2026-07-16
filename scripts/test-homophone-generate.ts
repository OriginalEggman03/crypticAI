import { loadEnvLocal } from "@/lib/load-env-local";
import { ensureHomophoneDatabase } from "@/lib/db/homophones";
import { generateVerifiedHomophoneClue } from "@/lib/homophone-pipeline";

loadEnvLocal();

async function main() {
  await ensureHomophoneDatabase();

  const count = Math.max(1, parseInt(process.argv[2] ?? "3", 10) || 3);

  console.log(`Generating ${count} homophone clue(s)\n`);

  const apiKey = process.env.ANTHROPIC_API_KEY ?? null;
  const skipLlm = process.argv.includes("--programmatic");

  for (let i = 0; i < count; i++) {
    const outcome = await generateVerifiedHomophoneClue(
      apiKey,
      { exclude: [] },
      { skipLlm }
    );

    if ("error" in outcome) {
      console.error(`Attempt ${i + 1}: ${outcome.error}`);
      continue;
    }

    console.log(`--- Clue ${i + 1} ---`);
    console.log(`Answer:  ${outcome.clue.answer}`);
    console.log(`Fodder:  ${outcome.clue.anagramFodder}`);
    console.log(`Surface: ${outcome.clue.clue}`);
    console.log(`Strategy: ${outcome.strategy}, llmCalls: ${outcome.llmCalls}`);
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
