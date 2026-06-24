import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { themeDefinitionSeeds } from "../lib/definition-quality";
import {
  getCachedDefinitionSeeds,
  saveCachedDefinitionSeeds,
} from "../lib/db/definition-seed-cache";
import { MIN_REGISTRY_SEEDS_BEFORE_CLAUDE } from "../lib/claude-definition-seeds";
import { collectDefinitionSeeds } from "../lib/definition-domains";

const dir = mkdtempSync(join(tmpdir(), "seed-cache-test-"));
process.env.DATABASE_PATH = join(dir, "test.db");

const obscure = "Vintage steam locomotives of the 1930s";
assert.ok(
  collectDefinitionSeeds(obscure, "").length < MIN_REGISTRY_SEEDS_BEFORE_CLAUDE
);

const cached = [
  "A steam-age locomotive",
  "A railway museum exhibit",
  "A platform announcement",
];
saveCachedDefinitionSeeds(obscure, cached);
assert.deepEqual(getCachedDefinitionSeeds(obscure), cached);

const merged = themeDefinitionSeeds(obscure, "FLYING SCOTSMAN", cached);
assert.ok(merged.some((seed) => /locomotive|railway|steam/i.test(seed)));

console.log("definition-seed-cache tests passed");
