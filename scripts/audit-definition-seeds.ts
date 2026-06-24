/**
 * Audit definition-seed coverage for inspirations (no API).
 * Usage: npx tsx scripts/audit-definition-seeds.ts
 */
import {
  inspirationHasDefinitionSeeds,
  listThemeDomains,
  themeDefinitionSeeds,
} from "../lib/definition-quality";

const SAMPLE_INSPIRATIONS = [
  "Mortal Kombat characters",
  "Harry Potter spells and characters",
  "Studio Ghibli films",
  "British birds and garden wildlife",
  "Greek mythology heroes",
  "Chess openings and pieces",
  "French cuisine and ingredients",
  "Doctor Who companions",
  "Pokémon types and trainers",
  "Marvel Avengers roster",
  "Agatha Christie detectives",
  "Medieval knights and castles",
  "Dogs, cats and pets",
  "James Bond villains",
  "herbal teas and infusions",
  "Tour de France cycling legends",
  "Wimbledon tennis champions",
  "Premier League football stars",
  "Classic detective fiction",
  "Broadway musicals",
  "Space exploration and planets",
  "Vintage cars and marques",
  "Board games and card games",
  "Nintendo heroes and items",
  "Rock and roll hall of fame",
  "Egyptian pharaohs and gods",
  "Botany and flowers",
  "Pirates and the high seas",
  "Weather and the seasons",
  "London landmarks and boroughs",
];

const rows = SAMPLE_INSPIRATIONS.map((inspiration) => {
  const domains = listThemeDomains(inspiration);
  const seeds = themeDefinitionSeeds(inspiration, "SAMPLE ANSWER");
  return {
    inspiration,
    domains: domains.join(", ") || "—",
    seedCount: seeds.length,
    sample: seeds.slice(0, 2).join(" | ") || "—",
  };
});

const covered = rows.filter((r) => r.seedCount > 0).length;
console.log(`Coverage: ${covered}/${rows.length} sample inspirations have seeds\n`);
console.log("Inspiration".padEnd(42), "Domains".padEnd(28), "Seeds", "Samples");
console.log("-".repeat(100));
for (const row of rows) {
  console.log(
    row.inspiration.slice(0, 40).padEnd(42),
    row.domains.slice(0, 26).padEnd(28),
    String(row.seedCount).padStart(3),
    row.sample.slice(0, 40)
  );
}

const gaps = rows.filter((r) => r.seedCount === 0);
if (gaps.length > 0) {
  console.log(`\n${gaps.length} inspirations with NO seeds:`);
  for (const g of gaps) console.log(`  - ${g.inspiration}`);
}
