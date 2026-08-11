import { getServerSupabase } from "../supabase-service-client";
import { computePeriodDelta } from "./period-delta";

export type GoogleLandingPage = {
  page: string;
  sessions: number;
  users?: number;
  engagementRate?: number;
};

export type GoogleSource = {
  sourceMedium: string;
  sessions: number;
  users?: number;
};

export type GoogleQueryRow = {
  query?: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GoogleDiscoveryMetrics = {
  connected: boolean;
  metricDate: string | null;
  syncedAt: string | null;
  periods: Record<string, { startDate: string; endDate: string }> | null;
  ga4SessionsToday: number | null;
  ga4UsersToday: number | null;
  ga4Sessions7d: number | null;
  ga4Users7d: number | null;
  ga4PageViews7d: number | null;
  ga4SessionsPrev7d: number | null;
  ga4UsersPrev7d: number | null;
  ga4PageViewsPrev7d: number | null;
  ga4Sessions30d: number | null;
  ga4Users30d: number | null;
  ga4EngagementRate7d: number | null;
  ga4Conversions7d: number | null;
  ga4TopLandingPages: GoogleLandingPage[];
  ga4TopSources: GoogleSource[];
  gscClicks7d: number | null;
  gscImpressions7d: number | null;
  gscClicksPrev7d: number | null;
  gscImpressionsPrev7d: number | null;
  gscCtr7d: number | null;
  gscAvgPosition7d: number | null;
  gscTopQueries: GoogleQueryRow[];
  gscTopPages: GoogleQueryRow[];
  gscQueryChanges: Array<{
    query: string;
    clicks7d: number;
    clicksPrev7d: number | null;
    deltaClicks: number | null;
  }>;
  deltas: {
    sessions7d: ReturnType<typeof computePeriodDelta>;
    users7d: ReturnType<typeof computePeriodDelta>;
    gscClicks7d: ReturnType<typeof computePeriodDelta>;
    gscImpressions7d: ReturnType<typeof computePeriodDelta>;
  };
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  lastSuccessfulSyncAt: string | null;
};

const EMPTY: GoogleDiscoveryMetrics = {
  connected: false,
  metricDate: null,
  syncedAt: null,
  periods: null,
  ga4SessionsToday: null,
  ga4UsersToday: null,
  ga4Sessions7d: null,
  ga4Users7d: null,
  ga4PageViews7d: null,
  ga4SessionsPrev7d: null,
  ga4UsersPrev7d: null,
  ga4PageViewsPrev7d: null,
  ga4Sessions30d: null,
  ga4Users30d: null,
  ga4EngagementRate7d: null,
  ga4Conversions7d: null,
  ga4TopLandingPages: [],
  ga4TopSources: [],
  gscClicks7d: null,
  gscImpressions7d: null,
  gscClicksPrev7d: null,
  gscImpressionsPrev7d: null,
  gscCtr7d: null,
  gscAvgPosition7d: null,
  gscTopQueries: [],
  gscTopPages: [],
  gscQueryChanges: [],
  deltas: {
    sessions7d: computePeriodDelta(null, null),
    users7d: computePeriodDelta(null, null),
    gscClicks7d: computePeriodDelta(null, null),
    gscImpressions7d: computePeriodDelta(null, null),
  },
  lastSyncStatus: null,
  lastSyncError: null,
  lastSuccessfulSyncAt: null,
};

/** Latest Google (GA4 + Search Console) snapshot for founder Acquisition / briefing. */
export async function fetchGoogleDiscoveryMetrics(
  workspaceId: string
): Promise<GoogleDiscoveryMetrics> {
  const supabase = getServerSupabase();
  if (!supabase || !workspaceId) return EMPTY;

  const [{ data: conn }, { data: snap }] = await Promise.all([
    supabase
      .from("hq_oauth_connections")
      .select("status, last_sync_at, last_sync_status, last_sync_error, metadata")
      .eq("workspace_id", workspaceId)
      .eq("provider", "google")
      .maybeSingle(),
    supabase
      .from("hq_integration_metric_snapshots")
      .select("metric_date, metrics, created_at")
      .eq("workspace_id", workspaceId)
      .eq("provider", "google")
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const connected = Boolean(
    conn && (conn.status === "connected" || conn.status === "degraded" || conn.status === "error")
  );
  const metrics = (snap?.metrics || {}) as Record<string, unknown>;
  const meta = (conn?.metadata || {}) as Record<string, unknown>;

  const ga4Sessions7d = numOrNull(metrics.ga4Sessions7d);
  const ga4Users7d = numOrNull(metrics.ga4Users7d);
  const ga4SessionsPrev7d = numOrNull(metrics.ga4SessionsPrev7d);
  const ga4UsersPrev7d = numOrNull(metrics.ga4UsersPrev7d);
  const gscClicks7d = numOrNull(metrics.gscClicks7d);
  const gscImpressions7d = numOrNull(metrics.gscImpressions7d);
  const gscClicksPrev7d = numOrNull(metrics.gscClicksPrev7d);
  const gscImpressionsPrev7d = numOrNull(metrics.gscImpressionsPrev7d);

  return {
    connected,
    metricDate: snap?.metric_date || null,
    syncedAt:
      (typeof metrics.syncedAt === "string" && metrics.syncedAt) ||
      conn?.last_sync_at ||
      snap?.created_at ||
      null,
    periods: (metrics.periods as GoogleDiscoveryMetrics["periods"]) || null,
    ga4SessionsToday: numOrNull(metrics.ga4SessionsToday),
    ga4UsersToday: numOrNull(metrics.ga4UsersToday),
    ga4Sessions7d,
    ga4Users7d,
    ga4PageViews7d: numOrNull(metrics.ga4PageViews7d),
    ga4SessionsPrev7d,
    ga4UsersPrev7d,
    ga4PageViewsPrev7d: numOrNull(metrics.ga4PageViewsPrev7d),
    ga4Sessions30d: numOrNull(metrics.ga4Sessions30d),
    ga4Users30d: numOrNull(metrics.ga4Users30d),
    ga4EngagementRate7d: numOrNull(metrics.ga4EngagementRate7d),
    ga4Conversions7d: numOrNull(metrics.ga4Conversions7d),
    ga4TopLandingPages: Array.isArray(metrics.ga4TopLandingPages)
      ? (metrics.ga4TopLandingPages as GoogleLandingPage[])
      : [],
    ga4TopSources: Array.isArray(metrics.ga4TopSources)
      ? (metrics.ga4TopSources as GoogleSource[])
      : [],
    gscClicks7d,
    gscImpressions7d,
    gscClicksPrev7d,
    gscImpressionsPrev7d,
    gscCtr7d: numOrNull(metrics.gscCtr7d),
    gscAvgPosition7d: numOrNull(metrics.gscAvgPosition7d),
    gscTopQueries: Array.isArray(metrics.gscTopQueries)
      ? (metrics.gscTopQueries as GoogleQueryRow[])
      : [],
    gscTopPages: Array.isArray(metrics.gscTopPages)
      ? (metrics.gscTopPages as GoogleQueryRow[])
      : [],
    gscQueryChanges: Array.isArray(metrics.gscQueryChanges)
      ? (metrics.gscQueryChanges as GoogleDiscoveryMetrics["gscQueryChanges"])
      : [],
    deltas: {
      sessions7d: computePeriodDelta(ga4Sessions7d, ga4SessionsPrev7d, {
        periodLabel: "vs prior 7d",
      }),
      users7d: computePeriodDelta(ga4Users7d, ga4UsersPrev7d, { periodLabel: "vs prior 7d" }),
      gscClicks7d: computePeriodDelta(gscClicks7d, gscClicksPrev7d, {
        periodLabel: "vs prior 7d",
      }),
      gscImpressions7d: computePeriodDelta(gscImpressions7d, gscImpressionsPrev7d, {
        periodLabel: "vs prior 7d",
      }),
    },
    lastSyncStatus: conn?.last_sync_status || null,
    lastSyncError: conn?.last_sync_error || null,
    lastSuccessfulSyncAt:
      typeof meta.lastSuccessfulSyncAt === "string" ? meta.lastSuccessfulSyncAt : null,
  };
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type TikTokTopVideo = {
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

/**
 * Organic TikTok discovery from Display / Login Kit snapshots.
 * Structured so Business API fields can land in the same shape later.
 */
export type TikTokDiscoveryMetrics = {
  connected: boolean;
  metricDate: string | null;
  syncedAt: string | null;
  displayName: string | null;
  username: string | null;
  followerCount: number | null;
  followingCount: number | null;
  likesCount: number | null;
  videoCount: number | null;
  videoSampleCount: number | null;
  viewsSample: number | null;
  likesSample: number | null;
  commentsSample: number | null;
  sharesSample: number | null;
  viewsSamplePrev: number | null;
  videosPosted7d: number | null;
  videosPostedPrev7d: number | null;
  viewsOnVideosPosted7d: number | null;
  viewsOnVideosPostedPrev7d: number | null;
  topVideos: TikTokTopVideo[];
  deltas: {
    viewsSample: ReturnType<typeof computePeriodDelta>;
    videosPosted7d: ReturnType<typeof computePeriodDelta>;
  };
  apiSurface: string | null;
  extensions: Record<string, unknown> | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  lastSuccessfulSyncAt: string | null;
};

const EMPTY_TIKTOK: TikTokDiscoveryMetrics = {
  connected: false,
  metricDate: null,
  syncedAt: null,
  displayName: null,
  username: null,
  followerCount: null,
  followingCount: null,
  likesCount: null,
  videoCount: null,
  videoSampleCount: null,
  viewsSample: null,
  likesSample: null,
  commentsSample: null,
  sharesSample: null,
  viewsSamplePrev: null,
  videosPosted7d: null,
  videosPostedPrev7d: null,
  viewsOnVideosPosted7d: null,
  viewsOnVideosPostedPrev7d: null,
  topVideos: [],
  deltas: {
    viewsSample: computePeriodDelta(null, null),
    videosPosted7d: computePeriodDelta(null, null),
  },
  apiSurface: null,
  extensions: null,
  lastSyncStatus: null,
  lastSyncError: null,
  lastSuccessfulSyncAt: null,
};

/** Latest TikTok organic snapshot for Acquisition / Today / Action Center. */
export async function fetchTikTokDiscoveryMetrics(
  workspaceId: string
): Promise<TikTokDiscoveryMetrics> {
  const supabase = getServerSupabase();
  if (!supabase || !workspaceId) return EMPTY_TIKTOK;

  const [{ data: conn }, { data: snaps }] = await Promise.all([
    supabase
      .from("hq_oauth_connections")
      .select("status, last_sync_at, last_sync_status, last_sync_error, metadata, account_label")
      .eq("workspace_id", workspaceId)
      .eq("provider", "tiktok")
      .maybeSingle(),
    supabase
      .from("hq_integration_metric_snapshots")
      .select("metric_date, metrics, created_at")
      .eq("workspace_id", workspaceId)
      .eq("provider", "tiktok")
      .order("metric_date", { ascending: false })
      .limit(2),
  ]);

  const connected = Boolean(
    conn && (conn.status === "connected" || conn.status === "degraded" || conn.status === "error")
  );
  const latest = snaps?.[0] || null;
  const prev = snaps?.[1] || null;
  const metrics = (latest?.metrics || {}) as Record<string, unknown>;
  const prevMetrics = (prev?.metrics || {}) as Record<string, unknown>;
  const meta = (conn?.metadata || {}) as Record<string, unknown>;

  const viewsSample = numOrNull(metrics.viewsSample);
  const viewsSamplePrev = numOrNull(prevMetrics.viewsSample);
  const videosPosted7d = numOrNull(metrics.videosPosted7d);
  const videosPostedPrev7d = numOrNull(metrics.videosPostedPrev7d);

  return {
    connected,
    metricDate: latest?.metric_date || null,
    syncedAt:
      (typeof metrics.syncedAt === "string" && metrics.syncedAt) ||
      conn?.last_sync_at ||
      latest?.created_at ||
      null,
    displayName:
      (typeof metrics.displayName === "string" && metrics.displayName) ||
      conn?.account_label ||
      null,
    username: typeof metrics.username === "string" ? metrics.username : null,
    followerCount: numOrNull(metrics.followerCount),
    followingCount: numOrNull(metrics.followingCount),
    likesCount: numOrNull(metrics.likesCount),
    videoCount: numOrNull(metrics.videoCount),
    videoSampleCount: numOrNull(metrics.videoSampleCount),
    viewsSample,
    likesSample: numOrNull(metrics.likesSample),
    commentsSample: numOrNull(metrics.commentsSample),
    sharesSample: numOrNull(metrics.sharesSample),
    viewsSamplePrev,
    videosPosted7d,
    videosPostedPrev7d,
    viewsOnVideosPosted7d: numOrNull(metrics.viewsOnVideosPosted7d),
    viewsOnVideosPostedPrev7d: numOrNull(metrics.viewsOnVideosPostedPrev7d),
    topVideos: Array.isArray(metrics.topVideos)
      ? (metrics.topVideos as TikTokTopVideo[])
      : [],
    deltas: {
      viewsSample: computePeriodDelta(viewsSample, viewsSamplePrev, {
        periodLabel: "vs prior sync",
      }),
      videosPosted7d: computePeriodDelta(videosPosted7d, videosPostedPrev7d, {
        periodLabel: "vs prior 7d",
      }),
    },
    apiSurface: typeof metrics.apiSurface === "string" ? metrics.apiSurface : null,
    extensions:
      metrics.extensions && typeof metrics.extensions === "object"
        ? (metrics.extensions as Record<string, unknown>)
        : null,
    lastSyncStatus: conn?.last_sync_status || null,
    lastSyncError: conn?.last_sync_error || null,
    lastSuccessfulSyncAt:
      typeof meta.lastSuccessfulSyncAt === "string" ? meta.lastSuccessfulSyncAt : null,
  };
}

export type PinterestTopPin = {
  pinId: string;
  title: string | null;
  link: string | null;
  impression: number;
  pinClick: number;
  outboundClick: number;
  save: number;
  engagement: number;
};

/** Organic Pinterest discovery from v5 user_account analytics snapshots. */
export type PinterestDiscoveryMetrics = {
  connected: boolean;
  metricDate: string | null;
  syncedAt: string | null;
  username: string | null;
  businessName: string | null;
  followerCount: number | null;
  pinCount: number | null;
  boardCount: number | null;
  impressions7d: number | null;
  pinClicks7d: number | null;
  outboundClicks7d: number | null;
  saves7d: number | null;
  engagement7d: number | null;
  profileVisits7d: number | null;
  impressionsPrev7d: number | null;
  pinClicksPrev7d: number | null;
  outboundClicksPrev7d: number | null;
  topPins: PinterestTopPin[];
  deltas: {
    impressions7d: ReturnType<typeof computePeriodDelta>;
    outboundClicks7d: ReturnType<typeof computePeriodDelta>;
  };
  apiSurface: string | null;
  extensions: Record<string, unknown> | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  lastSuccessfulSyncAt: string | null;
};

const EMPTY_PINTEREST: PinterestDiscoveryMetrics = {
  connected: false,
  metricDate: null,
  syncedAt: null,
  username: null,
  businessName: null,
  followerCount: null,
  pinCount: null,
  boardCount: null,
  impressions7d: null,
  pinClicks7d: null,
  outboundClicks7d: null,
  saves7d: null,
  engagement7d: null,
  profileVisits7d: null,
  impressionsPrev7d: null,
  pinClicksPrev7d: null,
  outboundClicksPrev7d: null,
  topPins: [],
  deltas: {
    impressions7d: computePeriodDelta(null, null),
    outboundClicks7d: computePeriodDelta(null, null),
  },
  apiSurface: null,
  extensions: null,
  lastSyncStatus: null,
  lastSyncError: null,
  lastSuccessfulSyncAt: null,
};

export async function fetchPinterestDiscoveryMetrics(
  workspaceId: string
): Promise<PinterestDiscoveryMetrics> {
  const supabase = getServerSupabase();
  if (!supabase || !workspaceId) return EMPTY_PINTEREST;

  const [{ data: conn }, { data: snap }] = await Promise.all([
    supabase
      .from("hq_oauth_connections")
      .select("status, last_sync_at, last_sync_status, last_sync_error, metadata, account_label")
      .eq("workspace_id", workspaceId)
      .eq("provider", "pinterest")
      .maybeSingle(),
    supabase
      .from("hq_integration_metric_snapshots")
      .select("metric_date, metrics, created_at")
      .eq("workspace_id", workspaceId)
      .eq("provider", "pinterest")
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const connected = Boolean(
    conn && (conn.status === "connected" || conn.status === "degraded" || conn.status === "error")
  );
  const metrics = (snap?.metrics || {}) as Record<string, unknown>;
  const meta = (conn?.metadata || {}) as Record<string, unknown>;

  const impressions7d = numOrNull(metrics.impressions7d);
  const impressionsPrev7d = numOrNull(metrics.impressionsPrev7d);
  const outboundClicks7d = numOrNull(metrics.outboundClicks7d);
  const outboundClicksPrev7d = numOrNull(metrics.outboundClicksPrev7d);

  return {
    connected,
    metricDate: snap?.metric_date || null,
    syncedAt:
      (typeof metrics.syncedAt === "string" && metrics.syncedAt) ||
      conn?.last_sync_at ||
      snap?.created_at ||
      null,
    username:
      (typeof metrics.username === "string" && metrics.username) ||
      conn?.account_label ||
      null,
    businessName: typeof metrics.businessName === "string" ? metrics.businessName : null,
    followerCount: numOrNull(metrics.followerCount),
    pinCount: numOrNull(metrics.pinCount),
    boardCount: numOrNull(metrics.boardCount),
    impressions7d,
    pinClicks7d: numOrNull(metrics.pinClicks7d),
    outboundClicks7d,
    saves7d: numOrNull(metrics.saves7d),
    engagement7d: numOrNull(metrics.engagement7d),
    profileVisits7d: numOrNull(metrics.profileVisits7d),
    impressionsPrev7d,
    pinClicksPrev7d: numOrNull(metrics.pinClicksPrev7d),
    outboundClicksPrev7d,
    topPins: Array.isArray(metrics.topPins) ? (metrics.topPins as PinterestTopPin[]) : [],
    deltas: {
      impressions7d: computePeriodDelta(impressions7d, impressionsPrev7d, {
        periodLabel: "vs prior 7d",
      }),
      outboundClicks7d: computePeriodDelta(outboundClicks7d, outboundClicksPrev7d, {
        periodLabel: "vs prior 7d",
      }),
    },
    apiSurface: typeof metrics.apiSurface === "string" ? metrics.apiSurface : null,
    extensions:
      metrics.extensions && typeof metrics.extensions === "object"
        ? (metrics.extensions as Record<string, unknown>)
        : null,
    lastSyncStatus: conn?.last_sync_status || null,
    lastSyncError: conn?.last_sync_error || null,
    lastSuccessfulSyncAt:
      typeof meta.lastSuccessfulSyncAt === "string" ? meta.lastSuccessfulSyncAt : null,
  };
}


export type AppStoreDailyPoint = { date: string; appUnits: number };

export type AppStoreDiscoveryMetrics = {
  connected: boolean;
  metricDate: string | null;
  syncedAt: string | null;
  appsVisible: number | null;
  appNames: string[];
  vendorNumber: string | null;
  reportLatestDate: string | null;
  appUnitsLatestDay: number | null;
  appUnits7d: number | null;
  appUnitsPrev7d: number | null;
  appUnits30d: number | null;
  downloadsReady: boolean;
  daily: AppStoreDailyPoint[];
  deltas: {
    appUnits7d: ReturnType<typeof computePeriodDelta>;
  };
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  lastSuccessfulSyncAt: string | null;
  setupWarnings: string[];
};

const EMPTY_APP_STORE: AppStoreDiscoveryMetrics = {
  connected: false,
  metricDate: null,
  syncedAt: null,
  appsVisible: null,
  appNames: [],
  vendorNumber: null,
  reportLatestDate: null,
  appUnitsLatestDay: null,
  appUnits7d: null,
  appUnitsPrev7d: null,
  appUnits30d: null,
  downloadsReady: false,
  daily: [],
  deltas: {
    appUnits7d: computePeriodDelta(null, null),
  },
  lastSyncStatus: null,
  lastSyncError: null,
  lastSuccessfulSyncAt: null,
  setupWarnings: [],
};

/** Latest App Store Connect App Units (downloads) for Acquisition / Today. */
export async function fetchAppStoreDiscoveryMetrics(
  workspaceId: string
): Promise<AppStoreDiscoveryMetrics> {
  const supabase = getServerSupabase();
  if (!supabase || !workspaceId) return EMPTY_APP_STORE;

  const [{ data: conn }, { data: snap }] = await Promise.all([
    supabase
      .from("hq_oauth_connections")
      .select("status, last_sync_at, last_sync_status, last_sync_error, metadata")
      .eq("workspace_id", workspaceId)
      .eq("provider", "app_store_connect")
      .maybeSingle(),
    supabase
      .from("hq_integration_metric_snapshots")
      .select("metric_date, metrics, created_at")
      .eq("workspace_id", workspaceId)
      .eq("provider", "app_store_connect")
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const connected = Boolean(
    conn && (conn.status === "connected" || conn.status === "degraded" || conn.status === "error")
  );
  const metrics = (snap?.metrics || {}) as Record<string, unknown>;
  const meta = (conn?.metadata || {}) as Record<string, unknown>;
  const appUnits7d = numOrNull(metrics.appUnits7d ?? metrics.downloads7d);
  const appUnitsPrev7d = numOrNull(metrics.appUnitsPrev7d ?? metrics.downloadsPrev7d);
  const setupWarnings = Array.isArray(metrics.setupWarnings)
    ? (metrics.setupWarnings as string[]).filter((s) => typeof s === "string")
    : [];
  if (typeof meta.vendorNumber !== "string" || !String(meta.vendorNumber).trim()) {
    if (!setupWarnings.some((w) => /vendor/i.test(w))) {
      setupWarnings.push("Add Vendor Number to pull downloads");
    }
  }

  return {
    connected,
    metricDate: snap?.metric_date || null,
    syncedAt:
      (typeof metrics.syncedAt === "string" && metrics.syncedAt) ||
      conn?.last_sync_at ||
      snap?.created_at ||
      null,
    appsVisible: numOrNull(metrics.appsVisible),
    appNames: Array.isArray(metrics.appNames)
      ? (metrics.appNames as string[]).filter((n) => typeof n === "string")
      : [],
    vendorNumber:
      (typeof metrics.vendorNumber === "string" && metrics.vendorNumber) ||
      (typeof meta.vendorNumber === "string" && meta.vendorNumber) ||
      null,
    reportLatestDate: typeof metrics.reportLatestDate === "string" ? metrics.reportLatestDate : null,
    appUnitsLatestDay: numOrNull(metrics.appUnitsLatestDay),
    appUnits7d,
    appUnitsPrev7d,
    appUnits30d: numOrNull(metrics.appUnits30d ?? metrics.downloads30d),
    downloadsReady: Boolean(metrics.downloadsReady),
    daily: Array.isArray(metrics.daily)
      ? (metrics.daily as AppStoreDailyPoint[]).filter(
          (d) => d && typeof d.date === "string" && typeof d.appUnits === "number"
        )
      : [],
    deltas: {
      appUnits7d: computePeriodDelta(appUnits7d, appUnitsPrev7d, {
        periodLabel: "vs prior 7d",
      }),
    },
    lastSyncStatus: conn?.last_sync_status || null,
    lastSyncError: conn?.last_sync_error || null,
    lastSuccessfulSyncAt:
      typeof meta.lastSuccessfulSyncAt === "string" ? meta.lastSuccessfulSyncAt : null,
    setupWarnings,
  };
}
