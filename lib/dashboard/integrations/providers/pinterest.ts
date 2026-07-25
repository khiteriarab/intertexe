import type { ProviderAdapter, TokenBundle } from "../types";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

const SCOPES = ["user_accounts:read", "pins:read", "ads:read"].join(",");

export const pinterestAdapter: ProviderAdapter = {
  id: "pinterest",

  isConfigured() {
    return Boolean(process.env.PINTEREST_OAUTH_APP_ID && process.env.PINTEREST_OAUTH_APP_SECRET);
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const params = new URLSearchParams({
      client_id: requireEnv("PINTEREST_OAUTH_APP_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      state,
    });
    return `https://www.pinterest.com/oauth/?${params}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const basic = Buffer.from(
      `${requireEnv("PINTEREST_OAUTH_APP_ID")}:${requireEnv("PINTEREST_OAUTH_APP_SECRET")}`
    ).toString("base64");
    const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || !json.access_token) {
      throw new Error(String(json.message || json.error || "Pinterest token exchange failed"));
    }
    return mapPinterestToken(json);
  },

  async refreshAccessToken(refreshToken: string) {
    const basic = Buffer.from(
      `${requireEnv("PINTEREST_OAUTH_APP_ID")}:${requireEnv("PINTEREST_OAUTH_APP_SECRET")}`
    ).toString("base64");
    const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || !json.access_token) {
      throw new Error(String(json.message || json.error || "Pinterest refresh failed"));
    }
    return mapPinterestToken(json);
  },

  async enrichAccount(accessToken: string) {
    const res = await fetch("https://api.pinterest.com/v5/user_account", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return {};
    const u = await res.json();
    return {
      accountLabel: u.username || u.business_name || null,
      externalAccountId: u.id || null,
    };
  },

  async syncMetrics({ accessToken }) {
    const res = await fetch("https://api.pinterest.com/v5/pins?page_size=10", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    const items = Array.isArray(json.items) ? json.items : [];
    return {
      metrics: {
        syncedAt: new Date().toISOString(),
        pinsSample: items.length,
      },
      raw: json,
    };
  },
};

function mapPinterestToken(json: Record<string, unknown>): TokenBundle {
  const expiresIn = Number(json.expires_in || 2592000);
  return {
    accessToken: String(json.access_token),
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    tokenType: String(json.token_type || "bearer"),
    scopes: String(json.scope || SCOPES)
      .split(/[,\s]+/)
      .filter(Boolean),
  };
}
