import { DatabaseSync } from "node:sqlite";
import { isAdminUser } from "../lib/admin";
import { findUserByEmail, getCreditsStatus } from "../lib/db/users";

const path = process.env.DATABASE_PATH ?? "data/clues.db";
const db = new DatabaseSync(path);
const rows = db
  .prepare(
    `SELECT id, email, free_spins_used, credits,
            email_verified_at IS NOT NULL AS verified
     FROM users ORDER BY id`
  )
  .all() as {
  id: number;
  email: string;
  free_spins_used: number;
  credits: number;
  verified: number;
}[];

for (const row of rows) {
  const user = findUserByEmail(row.email);
  const credits = user ? getCreditsStatus(user) : null;
  console.log({
    ...row,
    admin: user ? isAdminUser(user) : false,
    canGenerate: credits?.canGenerate,
    adminUnlimited: credits?.adminUnlimited,
  });
}
