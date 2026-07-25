/**
 * Append Rakuten `u1` so affiliate purchase reports join to INTERTEXE identity.
 * Prefer signed-in Supabase user id; fall back to durable anonymous session id.
 */

const TOKEN_KEY = "intertexe_auth_token";
const SESSION_KEY = "intertexe_session_id";

export function appendU1(url: string, u1: string | null | undefined): string {
  if (!url || !u1) return url;
  const id = String(u1).trim();
  if (!id) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("linksynergy.com")) return url;
    parsed.searchParams.set("u1", id.slice(0, 255));
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Decode `sub` from a Supabase JWT without verifying (client-side identity only). */
export function readAuthUserIdFromToken(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { sub?: string };
    const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
    return sub || null;
  } catch {
    return null;
  }
}

export function getOrCreateClientSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(SESSION_KEY)?.trim();
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "";
  }
}

/** Best available u1 for outbound affiliate links in the browser. */
export function resolveClientU1(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromToken = readAuthUserIdFromToken(localStorage.getItem(TOKEN_KEY));
    if (fromToken) return fromToken;
    const session = getOrCreateClientSessionId();
    return session || null;
  } catch {
    return null;
  }
}

export function affiliateUrlWithClientU1(url: string): string {
  return appendU1(url, resolveClientU1());
}
