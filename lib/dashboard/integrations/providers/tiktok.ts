import type { ProviderAdapter, TokenBundle } from "../types";
import { syncTikTokAdsMetrics } from "../ads-platform-metrics";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

function tiktokClientKey(): string {
  return requireEnv("TIKTOK_OAUTH_CLIENT_KEY");
}

function tiktokClientSecret(): string {
  return requireEnv("TIKTOK_OAUTH_CLIENT_SECRET");
}

/**
 * Display / Login Kit scopes available today.
 * user.info.stats unlocks follower_count when the TikTok app is approved for it;
 * sync degrades gracefully if the field is missing.
 */
const REQUIRED_SCOPES = [
  "user.info.basic",
  "user.info.profile",
  "user.info.stats",
  "video.list",
];

function tiktokScopes(): string {
  const scoped = process.env.TIKTOK_OAUTH_SCOPES?.trim();
  const fromEnv = scoped ? scoped.split(/[,\s]+/).filter(Boolean) : [];
  return [...new Set([...REQUIRED_SCOPES, ...fromEnv])].join(",");
}

const VIDEO_FIELDS = [
  "id",
  "title",
  "create_time",
  "share_url",
  "cover_image_url",
  "view_count",
  "like_count",
  "comment_count",
  "share_count",
  "duration",
].join(",");

const USER_FIELDS = [
  "open_id",
  "display_name",
  "avatar_url",
  "username",
  "follower_count",
  "following_count",
  "likes_count",
  "video_count",
].join(",");

type TikTokVideoRaw = {
  id?: string;
  title?: string;
  create_time?: number;
  share_url?: string;
  cover_image_url?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  duration?: number;
};

type TikTokUserRaw = {
  open_id?: string;
  display_name?: string;
  avatar_url?: string;
  username?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
};

export type TikTokTopVideoMetric = {
  id: string;
  title: string;
  createTime: string | null;
  shareUrl: string | null;
  coverImageUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  durationSec: number | null;
};

export const tiktokAdapter: ProviderAdapter = {
  id: "tiktok",

  isConfigured() {
    return Boolean(process.env.TIKTOK_OAUTH_CLIENT_KEY && process.env.TIKTOK_OAUTH_CLIENT_SECRET);
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const params = new URLSearchParams({
      client_key: tiktokClientKey(),
      scope: tiktokScopes(),
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
        client_key: tiktokClientKey(),
        client_secret: tiktokClientSecret(),
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
        client_key: tiktokClientKey(),
        client_secret: tiktokClientSecret(),
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
    const user = await fetchTikTokUser(accessToken);
    return {
      accountLabel: user.display_name || user.username || null,
      externalAccountId: user.open_id || null,
    };
  },

  async syncMetrics({ accessToken }) {
    const [user, videoPayload] = await Promise.all([
      fetchTikTokUser(accessToken),
      fetchTikTokVideos(accessToken),
    ]);

    const videos = videoPayload.videos;
    const now = Date.now();
    const d7 = now - 7 * 24 * 60 * 60 * 1000;
    const d14 = now - 14 * 24 * 60 * 60 * 1000;

    const sum = (key: keyof TikTokVideoRaw) =>
      videos.reduce((s, v) => s + Number(v[key] || 0), 0);

    const createdIn = (fromMs: number, toMs: number) =>
      videos.filter((v) => {
        const t = Number(v.create_time || 0) * 1000;
        return t >= fromMs && t < toMs;
      });

    const last7 = createdIn(d7, now + 1);
    const prev7 = createdIn(d14, d7);

    const mapVideo = (v: TikTokVideoRaw): TikTokTopVideoMetric => ({
      id: String(v.id || ""),
      title: String(v.title || "").slice(0, 200) || "(untitled)",
      createTime: v.create_time
        ? new Date(Number(v.create_time) * 1000).toISOString()
        : null,
      shareUrl: v.share_url ? String(v.share_url) : null,
      coverImageUrl: v.cover_image_url ? String(v.cover_image_url) : null,
      viewCount: Number(v.view_count || 0),
      likeCount: Number(v.like_count || 0),
      commentCount: Number(v.comment_count || 0),
      shareCount: Number(v.share_count || 0),
      durationSec: v.duration != null ? Number(v.duration) : null,
    });

    const topVideos = [...videos]
      .sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0))
      .slice(0, 10)
      .map(mapVideo)
      .filter((v) => v.id);

    const statsScopeMissing =
      user.follower_count == null &&
      user.following_count == null &&
      user.likes_count == null &&
      user.video_count == null;

    const metrics: Record<string, unknown> = {
      syncedAt: new Date().toISOString(),
      apiSurface: "tiktok_display_login_kit_production",
      // Account (fields present when scopes approved)
      displayName: user.display_name || null,
      username: user.username || null,
      openId: user.open_id || null,
      avatarUrl: user.avatar_url || null,
      followerCount: numOrNull(user.follower_count),
      followingCount: numOrNull(user.following_count),
      likesCount: numOrNull(user.likes_count),
      videoCount: numOrNull(user.video_count),
      // Lifetime totals across the latest video page sample (max 20)
      videoSampleCount: videos.length,
      viewsSample: sum("view_count"),
      likesSample: sum("like_count"),
      commentsSample: sum("comment_count"),
      sharesSample: sum("share_count"),
      // Videos posted in window (create_time) — Display API has no daily view series
      videosPosted7d: last7.length,
      videosPostedPrev7d: prev7.length,
      viewsOnVideosPosted7d: last7.reduce((s, v) => s + Number(v.view_count || 0), 0),
      viewsOnVideosPostedPrev7d: prev7.reduce((s, v) => s + Number(v.view_count || 0), 0),
      topVideos,
      // Reserved for richer Business / organic analytics later
      statsScopeMissing,
      extensions: {
        businessOrganicReady: false,
        note:
          "Display API returns lifetime engagement on listed videos. Daily series / demographics need Business API when approved.",
      },
    };

    if (videoPayload.error) {
      metrics.tiktokError = videoPayload.error;
    }
    if (user.error) {
      metrics.tiktokUserError = user.error;
    } else if (statsScopeMissing) {
      metrics.tiktokUserError =
        "Follower count unavailable — reconnect TikTok after user.info.stats is approved on your production Login Kit app.";
    }

    const ads = await syncTikTokAdsMetrics();
    Object.assign(metrics, ads.metrics);
    return {
      metrics,
      raw: { user: user.raw, videos: videoPayload.raw, ads: ads.raw },
    };
  },
};

async function fetchTikTokUser(
  accessToken: string
): Promise<TikTokUserRaw & { error: string | null; raw: unknown }> {
  const res = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(USER_FIELDS)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const json = await res.json();
  const user = (json?.data?.user || json?.data || {}) as TikTokUserRaw;
  const errCode = json?.error?.code;
  const error =
    !res.ok || (errCode && errCode !== "ok")
      ? String(json?.error?.message || "TikTok user info failed")
      : null;
  return { ...user, error, raw: json };
}

async function fetchTikTokVideos(accessToken: string): Promise<{
  videos: TikTokVideoRaw[];
  error: string | null;
  raw: unknown;
}> {
  const res = await fetch(
    `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(VIDEO_FIELDS)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 20 }),
    }
  );
  const json = await res.json();
  const videos = (json?.data?.videos || []) as TikTokVideoRaw[];
  const errCode = json?.error?.code;
  const error =
    !res.ok || (errCode && errCode !== "ok")
      ? String(json?.error?.message || "TikTok video list failed")
      : null;
  return { videos, error, raw: json };
}

function mapTikTokToken(data: Record<string, unknown>): TokenBundle {
  const expiresIn = Number(data.expires_in || 86400);
  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    tokenType: "Bearer",
    scopes: String(data.scope || tiktokScopes())
      .split(/[,\s]+/)
      .filter(Boolean),
    externalAccountId: data.open_id ? String(data.open_id) : null,
  };
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
