import { createSign } from "crypto";
import type { ProviderAdapter, TokenBundle } from "../types";

/**
 * App Store Connect has no user OAuth for Analytics/Sales API.
 * Tokens are short-lived JWTs minted from a team .p8 key stored encrypted in HQ.
 */
export const appStoreConnectAdapter: ProviderAdapter = {
  id: "app_store_connect",

  isConfigured() {
    // User-supplied key is stored per connection; no global app OAuth required.
    return true;
  },

  getAuthorizationUrl() {
    throw new Error("App Store Connect uses API key upload, not OAuth redirect");
  },

  async exchangeCode() {
    throw new Error("App Store Connect uses API key upload, not OAuth code exchange");
  },

  async syncMetrics({ metadata }) {
    const keyId = String(metadata.keyId || "").trim();
    const issuerId = String(metadata.issuerId || "").trim();
    const privateKey = String(metadata.privateKeyPem || "").trim();
    if (!keyId || !issuerId || !privateKey) {
      return {
        metrics: {
          syncedAt: new Date().toISOString(),
          note: "Upload Key ID, Issuer ID, and .p8 private key to enable App Store Connect sync",
        },
      };
    }

    const jwt = mintAscJwt({ keyId, issuerId, privateKey });
    // Lightweight connectivity check — apps list.
    const res = await fetch("https://api.appstoreconnect.apple.com/v1/apps?limit=5", {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        metrics: {
          syncedAt: new Date().toISOString(),
          ascError: json?.errors?.[0]?.detail || "App Store Connect API error",
        },
        raw: json,
      };
    }
    const apps = Array.isArray(json.data) ? json.data : [];
    return {
      metrics: {
        syncedAt: new Date().toISOString(),
        appsVisible: apps.length,
        appNames: apps.map((a: { attributes?: { name?: string } }) => a.attributes?.name).filter(Boolean),
      },
      raw: { apps: apps.map((a: { id: string; attributes?: { name?: string; bundleId?: string } }) => ({
        id: a.id,
        name: a.attributes?.name,
        bundleId: a.attributes?.bundleId,
      })) },
    };
  },
};

export function mintAscJwt(args: { keyId: string; issuerId: string; privateKey: string }): string {
  const header = { alg: "ES256", kid: args.keyId, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: args.issuerId,
    iat: now,
    exp: now + 20 * 60,
    aud: "appstoreconnect-v1",
  };
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const data = `${enc(header)}.${enc(payload)}`;
  const key = args.privateKey.includes("BEGIN")
    ? args.privateKey
    : `-----BEGIN PRIVATE KEY-----\n${args.privateKey}\n-----END PRIVATE KEY-----`;
  const sign = createSign("SHA256");
  sign.update(data);
  sign.end();
  const sig = sign.sign(key);
  // Node returns DER; App Store Connect expects raw R||S for ES256.
  const raw = derToJose(sig);
  return `${data}.${raw.toString("base64url")}`;
}

function derToJose(der: Buffer): Buffer {
  // Minimal ECDSA DER → raw (r||s) for P-256.
  let offset = 2;
  if (der[1] & 0x80) offset += der[1] & 0x7f;
  offset++; // INTEGER tag for r
  const rLen = der[offset++];
  let r = der.subarray(offset, offset + rLen);
  offset += rLen;
  offset++; // INTEGER tag for s
  const sLen = der[offset++];
  let s = der.subarray(offset, offset + sLen);
  if (r.length === 33 && r[0] === 0) r = r.subarray(1);
  if (s.length === 33 && s[0] === 0) s = s.subarray(1);
  const out = Buffer.alloc(64);
  r.copy(out, 32 - r.length);
  s.copy(out, 64 - s.length);
  return out;
}

/** Build a TokenBundle placeholder after API key upload (JWT minted at sync time). */
export function appStoreKeyBundle(meta: {
  keyId: string;
  issuerId: string;
  privateKeyPem: string;
  accountLabel?: string;
}): TokenBundle {
  return {
    accessToken: "asc-key-stored",
    refreshToken: null,
    expiresAt: null,
    tokenType: "asc_api_key",
    accountLabel: meta.accountLabel || `ASC key ${meta.keyId}`,
    externalAccountId: meta.keyId,
    metadata: {
      keyId: meta.keyId,
      issuerId: meta.issuerId,
      privateKeyPem: meta.privateKeyPem,
    },
  };
}
