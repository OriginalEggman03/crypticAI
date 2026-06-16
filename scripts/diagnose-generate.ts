/**
 * One-shot diagnostic: run setter + verify, print failures.
 * Usage: npx tsx --env-file=.env.local scripts/diagnose-generate.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyPuzzleEntries } from "../lib/clue-verify";
import { anthropicChatJson, parseModelJson } from "../lib/llm";
import { setterModel } from "../lib/models";
import {
  buildGenerationPrompt,
  SETTER_SYSTEM,
} from "../lib/prompts";
import { ensureSpellChecker, themeWordsFromInspiration } from "../lib/spell-check";
import type { GenerateResponse, UserPreferences } from "../lib/types";

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

async function main() {
  loadEnvLocal();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("No ANTHROPIC_API_KEY");
    process.exit(1);
  }

  const prefs: UserPreferences = {
    inspiration: process.argv[2] ?? "Megamind, supervillain, Metro City, blue suit, alien",
    clueType: (process.argv[3] as UserPreferences["clueType"]) ?? "all",
  };

  console.log("Inspiration:", prefs.inspiration);
  console.log("Clue type:", prefs.clueType);
  console.log("Model:", setterModel());
  console.log("---");

  await ensureSpellChecker();
  const themeWords = themeWordsFromInspiration(prefs.inspiration);

  const draftContent = await anthropicChatJson({
    apiKey,
    model: setterModel(),
    system: SETTER_SYSTEM,
    user: buildGenerationPrompt(prefs),
  });

  const puzzle = parseModelJson<GenerateResponse>(draftContent);
  const drafts = puzzle.entries.map((e) => ({
    answer: e.answer,
    clue: e.clue,
    clueType: e.clueType ?? "unknown",
    anagramFodder: e.anagramFodder,
  }));

  console.log(`Draft: ${drafts.length} entries\n`);

  const failures = verifyPuzzleEntries(
    drafts,
    (prefs.clueType ?? "all") as import("../lib/clue-types").ClueTypeOption,
    themeWords
  );
  const byType = new Map<string, number>();
  for (const f of failures) {
    byType.set(f.clueType, (byType.get(f.clueType) ?? 0) + 1);
  }

  console.log(`Failures: ${failures.length} total`);
  console.log("By check type:", Object.fromEntries(byType));
  console.log("---");

  for (const f of failures) {
    console.log(`[${f.index + 1}] ${f.answer} (${f.clueType})`);
    console.log(`  Clue: ${f.clue}`);
    console.log(`  Reason: ${f.reason}\n`);
  }

  if (failures.length === 0) {
    console.log("All clues passed verification on first draft.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
