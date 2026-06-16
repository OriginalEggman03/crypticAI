import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const hash = scryptSync(password, salt, KEY_LEN);
  const expectedBuf = Buffer.from(expected, "hex");
  if (hash.length !== expectedBuf.length) return false;
  return timingSafeEqual(hash, expectedBuf);
}
