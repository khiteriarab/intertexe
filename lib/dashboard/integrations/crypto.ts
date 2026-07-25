import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function encryptionKey(): Buffer {
  const raw =
    process.env.HQ_TOKEN_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!raw) {
    throw new Error("HQ_TOKEN_ENCRYPTION_KEY (or SUPABASE_SERVICE_ROLE_KEY) is required to store OAuth tokens");
  }
  // Normalize any length secret to 32 bytes.
  return createHash("sha256").update(raw).digest();
}

/** Encrypt a secret string for DB storage. Format: iv:tag:ciphertext (base64). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted payload");
  const decipher = createDecipheriv(ALGO, encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function signOAuthState(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHash("sha256")
    .update(`${body}.${encryptionKey().toString("hex")}`)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(state: string, maxAgeMs = 15 * 60 * 1000): Record<string, unknown> | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHash("sha256")
    .update(`${body}.${encryptionKey().toString("hex")}`)
    .digest("base64url");
  if (expected !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    const ts = Number(parsed.ts || 0);
    if (!ts || Date.now() - ts > maxAgeMs) return null;
    return parsed;
  } catch {
    return null;
  }
}
