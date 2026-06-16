/**
 * Full pipeline diagnostic with repair steps logged.
 * Usage: npx tsx --env-file=.env.local scripts/diagnose-pipeline.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyPuzzleEntries } from "../lib/clue-verify";
import { anthropicChatJson, parseModelJson } from "../lib/llm";
import { criticModel, repairModel, setterModel } from "../lib/models";
import {
  buildCriticPrompt,
  buildGenerationPrompt,
  buildRepairPrompt,
  CRITIC_SYSTEM,
  REPAIR_SYSTEM,
  SETTER_SYSTEM,
} from "../lib/prompts";
import { ensureSpellChecker, themeWordsFromInspiration } from "../lib/spell-check";
import type { ClueTypeOption } from "../lib/clue-types";
import type { GenerateResponse, UserPreferences } from "../lib/types";

function clueTypeFor(prefs: UserPreferences): ClueTypeOption {
  return (prefs.clueType ?? "all") as ClueTypeOption;
}

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* optional */
  }
}

function printFailures(label: string, failures: ReturnType<typeof verifyPuzzleEntries>) {
  console.log(`\n=== ${label}: ${failures.length} failure(s) ===`);
  for (const f of failures) {
    console.log(`  [${f.index + 1}] ${f.answer} (${f.clueType}): ${f.reason}`);
  }
}

async function main() {
  loadEnvLocal();
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const prefs: UserPreferences = {
    inspiration: process.argv[2] ?? "Megamind, supervillain, Metro City, blue suit, alien",
    clueType: (process.argv[3] as UserPreferences["clueType"]) ?? "all",
  };

  await ensureSpellChecker();
  const themeWords = themeWordsFromInspiration(prefs.inspiration);

  let content = await anthropicChatJson({
    apiKey,
    model: setterModel(),
    system: SETTER_SYSTEM,
    user: buildGenerationPrompt(prefs),
  });
  let puzzle = parseModelJson<GenerateResponse>(content);

  content = await anthropicChatJson({
    apiKey,
    model: criticModel(),
    system: CRITIC_SYSTEM,
    user: buildCriticPrompt(prefs.inspiration, clueTypeFor(prefs), puzzle),
  });
  puzzle = parseModelJson<GenerateResponse>(content);

  const toDrafts = () =>
    puzzle.entries.map((e) => ({
      answer: e.answer,
      clue: e.clue,
      clueType: e.clueType ?? "unknown",
      anagramFodder: e.anagramFodder,
    }));

  let failures = verifyPuzzleEntries(toDrafts(), clueTypeFor(prefs), themeWords);
  printFailures("After critic", failures);

  for (let round = 1; round <= 4 && failures.length > 0; round++) {
    content = await anthropicChatJson({
      apiKey,
      model: repairModel(),
      system: REPAIR_SYSTEM,
      user: buildRepairPrompt(prefs.inspiration, clueTypeFor(prefs), puzzle, failures),
    });
    puzzle = parseModelJson<GenerateResponse>(content);
    failures = verifyPuzzleEntries(toDrafts(), clueTypeFor(prefs), themeWords);
    printFailures(`After repair ${round}`, failures);
    console.log(`  Entries returned: ${puzzle.entries?.length ?? 0}`);
  }
}

main().catch(console.error);
