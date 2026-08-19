import { AUTH_TOKEN_KEY } from "./session";

export const AUTH_REFRESH_KEY = "intertexe_refresh_token";

export function getWebAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setWebAuthTokens(token: string, refreshToken?: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(AUTH_REFRESH_KEY, refreshToken);
}

export function clearWebAuthTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_KEY);
}

function tokenFromHash(): { token: string; refresh: string | null } | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const token = params.get("access_token");
  if (!token) return null;
  return { token, refresh: params.get("refresh_token") };
}

/**
 * Website pages historically only read localStorage, while email confirm and
 * some logins persist a Supabase session instead. Copy that session into the
 * INTERTEXE token keys so signed-in shoppers are recognized without another gate.
 */
export async function hydrateWebAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const fromHash = tokenFromHash();
  if (fromHash?.token) {
    setWebAuthTokens(fromHash.token, fromHash.refresh);
    return fromHash.token;
  }

  const existing = getWebAuthToken();
  if (existing) return existing;

  try {
    const { createClientComponentClient } = await import("./supabase/client");
    const supabase = createClientComponentClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    setWebAuthTokens(token, data.session?.refresh_token || null);
    return token;
  } catch {
    return null;
  }
}

export async function refreshWebAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem(AUTH_REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const token = String(data.accessToken || data.token || "").trim();
    if (!token) return null;
    setWebAuthTokens(token, data.refreshToken || refreshToken);
    return token;
  } catch {
    return null;
  }
}
