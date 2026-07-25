import type { ProviderAdapter, TokenBundle } from "../types";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

const SCOPES = ["user.info.basic", "video.list"].join(",");

export const tiktokAdapter: ProviderAdapter = {
  id: "tiktok",

  isConfigured() {
    return Boolean(process.env.TIKTOK_OAUTH_CLIENT_KEY && process.env.TIKTOK_OAUTH_CLIENT_SECRET);
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const params = new URLSearchParams({
      client_key: requireEnv("TIKTOK_OAUTH_CLIENT_KEY"),
      scope: SCOPES,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: requireEnv("TIKTOK_OAUTH_CLIENT_KEY"),
        client_secret: requireEnv("TIKTOK_OAUTH_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;
    const data = (json.data as Record<string, unknown>) || json;
    if (!res.ok || !data.access_token) {
      throw new Error(String(json.error_description || json.message || "TikTok token exchange failed"));
    }
    return mapTikTokToken(data);
  },

  async refreshAccessToken(refreshToken: string) {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: requireEnv("TIKTOK_OAUTH_CLIENT_KEY"),
        client_secret: requireEnv("TIKTOK_OAUTH_CLIENT_SECRET"),
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;
    const data = (json.data as Record<string, unknown>) || json;
    if (!res.ok || !data.access_token) {
      throw new Error(String(json.error_description || json.message || "TikTok refresh failed"));
    }
    return mapTikTokToken(data);
  },

  async enrichAccount(accessToken: string) {
    const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    const user = json?.data?.user || json?.data || {};
    return {
      accountLabel: user.display_name || null,
      externalAccountId: user.open_id || null,
    };
  },

  async syncMetrics({ accessToken }) {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,title,view_count,like_count,comment_count,share_count",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: 10 }),
      }
    );
    const json = await res.json();
    const videos = json?.data?.videos || [];
    const metrics: Record<string, unknown> = {
      syncedAt: new Date().toISOString(),
      videoCountSample: videos.length,
      viewsSample: videos.reduce((s: number, v: { view_count?: number }) => s + Number(v.view_count || 0), 0),
      likesSample: videos.reduce((s: number, v: { like_count?: number }) => s + Number(v.like_count || 0), 0),
    };
    if (!res.ok) metrics.tiktokError = json?.error?.message || "TikTok video list failed";
    return { metrics, raw: json };
  },
};

function mapTikTokToken(data: Record<string, unknown>): TokenBundle {
  const expiresIn = Number(data.expires_in || 86400);
  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    tokenType: "Bearer",
    scopes: String(data.scope || SCOPES)
      .split(/[,\s]+/)
      .filter(Boolean),
    externalAccountId: data.open_id ? String(data.open_id) : null,
  };
}
