import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string, salt?: string) {
  const actualSalt = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, actualSalt, KEY_LENGTH).toString("hex");
  return { salt: actualSalt, hash };
}

export function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
) {
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(expectedHash, "hex");
  if (expected.length !== candidate.length) return false;
  return timingSafeEqual(expected, candidate);
}
