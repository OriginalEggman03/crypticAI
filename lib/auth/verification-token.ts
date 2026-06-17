import { createHash, randomBytes } from "node:crypto";

export const VERIFICATION_TOKEN_BYTES = 32;
export const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createVerificationToken(): {
  token: string;
  hash: string;
  expiresAt: string;
} {
  const token = randomBytes(VERIFICATION_TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MS).toISOString();
  return {
    token,
    hash: hashVerificationToken(token),
    expiresAt,
  };
}
