/**
 * Append Rakuten `u1` so affiliate purchase reports join to INTERTEXE identity.
 * Prefer signed-in Supabase user id; fall back to durable anonymous session id.
 */

import { getOrCreateSessionId } from "./session";

const TOKEN_KEY = "intertexe_auth_token";

export function appendU1(url: string, u1: string | null | undefined): string {
  if (!url || !u1) return url;
  const id = String(u1).trim();
  if (!id) return url;
  try {
    const parsed = new URL(url);
    // Rakuten click + deeplink hosts
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("linksynergy.com") && !host.includes("rakuten")) return url;
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

/** Best available u1 for outbound affiliate links in the browser. */
export function resolveClientU1(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromToken = readAuthUserIdFromToken(localStorage.getItem(TOKEN_KEY));
    if (fromToken) return fromToken;
    const session = getOrCreateSessionId();
    return session || null;
  } catch {
    return null;
  }
}

export function affiliateUrlWithClientU1(url: string): string {
  return appendU1(url, resolveClientU1());
}
