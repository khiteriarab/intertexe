import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const LIVE_PREFIX = "itx_live_";
export const TEST_PREFIX = "itx_test_";

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function generateApiKey(kind: "live" | "test" = "live"): {
  raw: string;
  hash: string;
  prefix: string;
  lastFour: string;
} {
  const body = randomBytes(24).toString("base64url");
  const raw = `${kind === "live" ? LIVE_PREFIX : TEST_PREFIX}${body}`;
  return {
    raw,
    hash: hashApiKey(raw),
    prefix: raw.slice(0, 12),
    lastFour: raw.slice(-4),
  };
}

export function looksLikeApiKey(raw: string): boolean {
  return raw.startsWith(LIVE_PREFIX) || raw.startsWith(TEST_PREFIX);
}

export function keysEqualHash(raw: string, storedHash: string): boolean {
  const a = Buffer.from(hashApiKey(raw), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function redactKey(raw: string): string {
  if (raw.length < 12) return "itx_***";
  return `${raw.slice(0, 12)}…${raw.slice(-4)}`;
}
