import type { ProviderAdapter, TokenBundle } from "../types";
import { resolveMetaAdAccountId, syncMetaAdsMetrics } from "../ads-platform-metrics";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

/** Instagram Basic Display scopes were retired; requesting them fails OAuth in Live mode. */
const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
  "ads_read",
].join(",");

export const metaAdapter: ProviderAdapter = {
  id: "meta",

  isConfigured() {
    return Boolean(process.env.META_OAUTH_APP_ID && process.env.META_OAUTH_APP_SECRET);
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const params = new URLSearchParams({
      client_id: requireEnv("META_OAUTH_APP_ID"),
      redirect_uri: redirectUri,
      state,
      scope: SCOPES,
      response_type: "code",
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const params = new URLSearchParams({
      client_id: requireEnv("META_OAUTH_APP_ID"),
      client_secret: requireEnv("META_OAUTH_APP_SECRET"),
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${params}`);
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || json.error) {
      const err = json.error as { message?: string } | undefined;
      throw new Error(err?.message || String(json.error_message || "Meta token exchange failed"));
    }

    // Exchange for long-lived user token (~60 days).
    const longParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: requireEnv("META_OAUTH_APP_ID"),
      client_secret: requireEnv("META_OAUTH_APP_SECRET"),
      fb_exchange_token: String(json.access_token),
    });
    const longRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${longParams}`);
    const longJson = (await longRes.json()) as Record<string, unknown>;
    const tokenJson = longRes.ok && longJson.access_token ? longJson : json;
    return mapMetaToken(tokenJson);
  },

  async refreshAccessToken(refreshToken: string) {
    // Meta long-lived tokens are refreshed by re-exchanging the current token.
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: requireEnv("META_OAUTH_APP_ID"),
      client_secret: requireEnv("META_OAUTH_APP_SECRET"),
      fb_exchange_token: refreshToken,
    });
    const res = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${params}`);
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || json.error) {
      const err = json.error as { message?: string } | undefined;
      throw new Error(err?.message || "Meta token refresh failed");
    }
    return mapMetaToken(json);
  },

  async enrichAccount(accessToken: string) {
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`
    );
    const me = (await meRes.json()) as { id?: string; name?: string };
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,followers_count,media_count}&access_token=${encodeURIComponent(accessToken)}`
    );
    const pages = (await pagesRes.json()) as {
      data?: Array<{
        id: string;
        name: string;
        access_token?: string;
        instagram_business_account?: {
          id: string;
          username?: string;
          followers_count?: number;
          media_count?: number;
        };
      }>;
    };
    const withIg = (pages.data || []).find((p) => p.instagram_business_account?.id);
    let adAccountId: string | null = null;
    try {
      adAccountId = await resolveMetaAdAccountId(accessToken, {});
    } catch {
      /* optional */
    }
    return {
      accountLabel: withIg?.instagram_business_account?.username
        ? `@${withIg.instagram_business_account.username}`
        : me.name || null,
      externalAccountId: withIg?.instagram_business_account?.id || me.id || null,
      metadata: {
        pageId: withIg?.id || null,
        pageAccessToken: withIg?.access_token || null,
        igUserId: withIg?.instagram_business_account?.id || null,
        igUsername: withIg?.instagram_business_account?.username || null,
        followerCount: withIg?.instagram_business_account?.followers_count ?? null,
        mediaCount: withIg?.instagram_business_account?.media_count ?? null,
        adAccountId,
      },
    };
  },

  async syncMetrics({ accessToken, metadata }) {
    const igUserId = String(metadata.igUserId || "").trim();
    const pageToken = String(metadata.pageAccessToken || accessToken);
    const metrics: Record<string, unknown> = { syncedAt: new Date().toISOString() };
    const raw: Record<string, unknown> = {};

    if (igUserId) {
      const profileRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}?fields=id,username,name,followers_count,follows_count,media_count&access_token=${encodeURIComponent(pageToken)}`
      );
      const profileJson = (await profileRes.json()) as {
        username?: string;
        name?: string;
        followers_count?: number;
        follows_count?: number;
        media_count?: number;
        error?: { message?: string };
      };
      raw.profile = profileJson;
      if (profileRes.ok && !profileJson.error) {
        metrics.apiSurface = "instagram_graph_facebook_login";
        metrics.username = profileJson.username || metadata.igUsername || null;
        metrics.displayName = profileJson.name || null;
        metrics.followerCount =
          profileJson.followers_count != null ? Number(profileJson.followers_count) : null;
        metrics.followsCount =
          profileJson.follows_count != null ? Number(profileJson.follows_count) : null;
        metrics.mediaCount =
          profileJson.media_count != null ? Number(profileJson.media_count) : null;
      } else {
        metrics.igError = profileJson.error?.message || "Instagram profile failed";
      }

      const insightRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/insights?metric=impressions,reach,profile_views&period=day&access_token=${encodeURIComponent(pageToken)}`
      );
      const insightJson = await insightRes.json();
      raw.insights = insightJson;
      if (insightRes.ok && Array.isArray(insightJson.data)) {
        for (const row of insightJson.data) {
          const vals = row.values || [];
          const last = vals[vals.length - 1];
          metrics[`ig_${row.name}`] = last?.value ?? null;
        }
      } else if (!metrics.igError) {
        metrics.igInsightsNote =
          insightJson?.error?.message ||
          "Daily Instagram insights need extra Meta permissions; follower count still syncs from the profile.";
      }
    } else {
      metrics.igNote = "No Instagram business account linked — ads metrics still sync when configured.";
    }

    const ads = await syncMetaAdsMetrics(accessToken, metadata);
    Object.assign(metrics, ads.metrics);
    raw.ads = ads.raw;

    return { metrics, raw };
  },
};

function mapMetaToken(json: Record<string, unknown>): TokenBundle {
  const expiresIn = Number(json.expires_in || 60 * 24 * 60 * 60);
  const access = String(json.access_token);
  return {
    accessToken: access,
    // Meta uses the long-lived user token itself for refresh exchange.
    refreshToken: access,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    tokenType: "Bearer",
    scopes: SCOPES.split(","),
  };
}
