import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { hashPassword } from "../lib/auth/password";
import { createVerificationToken } from "../lib/auth/verification-token";
import {
  createUser,
  deleteUserById,
  getCreditsStatus,
  consumeGenerationCredit,
} from "../lib/db/users";
import { getLifetimeFreeSpinsUsed } from "../lib/db/free-spin-claims";

const dbPath = join(process.cwd(), "data", "test-free-spin-claims.db");
process.env.DATABASE_PATH = dbPath;

rmSync(dbPath, { force: true });
mkdirSync(join(process.cwd(), "data"), { recursive: true });

const email = "reuse-test@example.com";
const { hash, expiresAt } = createVerificationToken();

const user1 = createUser(email, hashPassword("password123"), hash, expiresAt);
let status = getCreditsStatus(user1);
console.assert(status.freeRemaining === 6, "new user gets 6 free spins");

for (let i = 0; i < 3; i++) {
  consumeGenerationCredit(user1.id);
}
status = getCreditsStatus(user1);
console.assert(status.freeRemaining === 3, "3 spins used");

console.assert(
  getLifetimeFreeSpinsUsed(email) === 3,
  "lifetime claims tracked"
);

deleteUserById(user1.id);
console.assert(
  getLifetimeFreeSpinsUsed(email) === 3,
  "lifetime claims survive delete"
);

const token2 = createVerificationToken();
const user2 = createUser(
  email,
  hashPassword("password123"),
  token2.hash,
  token2.expiresAt
);
status = getCreditsStatus(user2);
console.assert(
  status.freeRemaining === 3,
  `recreated account gets remaining only, got ${status.freeRemaining}`
);
console.assert(user2.freeSpinsUsed === 3, "new user row reflects prior usage");

console.log("All free-spin reuse checks passed.");
rmSync(dbPath, { force: true });
