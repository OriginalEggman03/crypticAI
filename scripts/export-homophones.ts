import { mkdirSync, writeFileSync } from "node:fs";

import { join } from "node:path";

import { loadEnvLocal } from "@/lib/load-env-local";

import {

  ensureHomophoneDatabase,

  getHomophonePartners,

  getHomophoneStats,

} from "@/lib/db/homophones";

import { DatabaseSync } from "node:sqlite";

import { join as pathJoin, dirname } from "node:path";



loadEnvLocal();



function databasePath(): string {

  return process.env.DATABASE_PATH ?? pathJoin(process.cwd(), "data", "clues.db");

}



interface PairRow {

  word_a: string;

  word_b: string;

  definition_a: string;

  definition_b: string;

  phonetic_key: string;

}



async function main() {

  await ensureHomophoneDatabase();



  const dbPath = databasePath();

  const db = new DatabaseSync(dbPath);



  const pairs = db

    .prepare(

      `SELECT word_a, word_b, definition_a, definition_b, phonetic_key

       FROM homophone_pairs

       ORDER BY word_a COLLATE NOCASE, word_b COLLATE NOCASE`

    )

    .all() as PairRow[];



  const stats = getHomophoneStats();

  const outPath =

    process.argv[2]?.trim() ||

    join(process.cwd(), "data", "homophone-database-export.txt");



  mkdirSync(dirname(outPath), { recursive: true });



  const lines: string[] = [

    "# Cryptic AI homophone database export",

    `# Generated: ${new Date().toISOString()}`,

    `# Database: ${dbPath}`,

    `# Pairs: ${stats.pairs}`,

    `# Words: ${stats.words}`,

    "#",

    "# Format sections:",

    "#   [PAIRS]   word_a<TAB>word_b<TAB>phonetic_key<TAB>definition_a | definition_b",

    "#   [PARTNERS] answer<TAB>fodder1, fodder2, ...",

    "#   [SAMPLE]  known cryptic pairs sanity check",

    "#",

    "",

    "[PAIRS]",

  ];



  for (const pair of pairs) {

    lines.push(

      `${pair.word_a}\t${pair.word_b}\t${pair.phonetic_key}\t${pair.definition_a} | ${pair.definition_b}`

    );

  }



  lines.push("", "[PARTNERS]");



  const allWords = db

    .prepare(

      `SELECT DISTINCT word FROM (

        SELECT word_a AS word FROM homophone_pairs

        UNION

        SELECT word_b AS word FROM homophone_pairs

      ) ORDER BY word COLLATE NOCASE`

    )

    .all() as { word: string }[];



  for (const { word } of allWords) {

    const partners = getHomophonePartners(word);

    if (partners.length === 0) continue;

    lines.push(`${word}\t${partners.join(", ")}`);

  }



  lines.push("", "[SAMPLE]");



  const samples = [

    "kernel",

    "colonel",

    "meat",

    "meet",

    "thyme",

    "time",

    "two",

    "too",

    "steak",

    "stake",

    "flour",

    "flower",

    "night",

    "knight",

    "write",

    "right",

    "sea",

    "see",

    "allowed",

    "aloud",

    "ado",

    "adieu",

    "gauntlet",

    "gantlet",

  ];



  for (const word of samples) {

    const partners = getHomophonePartners(word);

    lines.push(`${word}\t${partners.length ? partners.join(", ") : "(none)"}`);

  }



  writeFileSync(outPath, lines.join("\n"), "utf8");

  console.log(`Exported ${pairs.length} pairs to ${outPath}`);

}



main().catch((err) => {

  console.error(err);

  process.exit(1);

});


