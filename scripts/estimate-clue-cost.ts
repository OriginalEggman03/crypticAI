/**
 * Estimate Anthropic cost for one clue generation.
 * Usage: npx tsx scripts/estimate-clue-cost.ts [inspiration]
 */
import { loadEnvLocal } from "../lib/load-env-local";
import { generateVerifiedAnagramClue } from "../lib/anagram-pipeline";
import { explainModel, setterModel } from "../lib/models";

loadEnvLocal();

const OPUS_INPUT_PER_MTOK = 5;
const OPUS_OUTPUT_PER_MTOK = 25;
const SONNET_INPUT_PER_MTOK = 3;
const SONNET_OUTPUT_PER_MTOK = 15;

/** Rough chars-per-token for English prose + JSON. */
const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function callCostUsd(
  system: string,
  user: string,
  response: string | undefined,
  model: string
): { input: number; output: number; total: number } {
  const inputTokens = estimateTokens(system) + estimateTokens(user);
  const outputTokens = estimateTokens(response ?? "");
  const isExplain = model.includes("sonnet") || model === explainModel();
  const inRate = isExplain && model.includes("sonnet") ? SONNET_INPUT_PER_MTOK : OPUS_INPUT_PER_MTOK;
  const outRate =
    isExplain && model.includes("sonnet") ? SONNET_OUTPUT_PER_MTOK : OPUS_OUTPUT_PER_MTOK;

  const input = (inputTokens / 1_000_000) * inRate;
  const output = (outputTokens / 1_000_000) * outRate;
  return { input, output, total: input + output };
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY required");
    process.exit(1);
  }

  const inspiration =
    process.argv[2]?.trim() || "James Bond gadgets and villains";

  console.log("Setter model:", setterModel());
  console.log("Explain model:", explainModel());
  console.log("Theme:", inspiration);
  console.log("Generating...\n");

  const out = await generateVerifiedAnagramClue(apiKey, {
    inspiration,
    difficulty: "easy",
  });

  if ("error" in out) {
    console.error("Failed:", out.error);
    console.error("LLM calls before failure:", out.llmCalls);
    process.exit(1);
  }

  const trace = out.claudeTrace ?? [];
  let totalUsd = 0;

  console.log(`Strategy: ${out.strategy}`);
  console.log(`LLM calls: ${out.llmCalls}`);
  console.log(`Trace entries: ${trace.length}\n`);

  for (const call of trace) {
    const model =
      call.label.includes("context") || call.label.includes("explanation")
        ? explainModel()
        : setterModel();
    const cost = callCostUsd(call.system, call.user, call.response, model);
    totalUsd += cost.total;
    console.log(
      `${call.order}. ${call.label} — ~$${cost.total.toFixed(4)} (in ~$${cost.input.toFixed(4)}, out ~$${cost.output.toFixed(4)})`
    );
  }

  console.log(`\nEstimated API cost this clue: ~$${totalUsd.toFixed(3)} USD`);
  console.log(
    `(Heuristic: ~${CHARS_PER_TOKEN} chars/token; Opus $5/$25 MTok unless explain model is Sonnet)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
