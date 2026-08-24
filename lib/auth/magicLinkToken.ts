import { randomBytes, createHash } from "node:crypto";

export function generateMagicLinkToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashMagicLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
