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
