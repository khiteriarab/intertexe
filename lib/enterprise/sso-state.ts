import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ENTERPRISE_SSO_STATE_COOKIE = "enterprise_sso_state";

const STATE_TTL_MS = 10 * 60 * 1000;

export type SsoStatePayload = {
  organizationId: string;
  nonce: string;
  exp: number;
};

function stateSecret(): string {
  const secret =
    process.env.ENTERPRISE_SSO_STATE_SECRET?.trim() ||
    process.env.ENTERPRISE_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  if (!secret) throw new Error("Enterprise SSO state secret is not configured.");
  return secret;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", stateSecret()).update(payloadB64).digest("base64url");
}

export function createSsoStateToken(organizationId: string): { token: string; nonce: string } {
  const nonce = randomBytes(16).toString("hex");
  const payload: SsoStatePayload = {
    organizationId,
    nonce,
    exp: Date.now() + STATE_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${payloadB64}.${sign(payloadB64)}`, nonce };
}

export function verifySsoStateToken(token: string): SsoStatePayload | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;
  const expected = sign(payloadB64);
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SsoStatePayload;
    if (!payload.organizationId || !payload.nonce || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
