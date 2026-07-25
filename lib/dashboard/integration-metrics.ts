import { getServerSupabase } from "../supabase-service-client";

export type GoogleDiscoveryMetrics = {
  connected: boolean;
  metricDate: string | null;
  syncedAt: string | null;
  ga4Sessions7d: number | null;
  ga4Users7d: number | null;
  ga4PageViews7d: number | null;
  gscClicks7d: number | null;
  gscImpressions7d: number | null;
  gscTopQueries: Array<{ query?: string; clicks?: number }>;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  lastSuccessfulSyncAt: string | null;
};

const EMPTY: GoogleDiscoveryMetrics = {
  connected: false,
  metricDate: null,
  syncedAt: null,
  ga4Sessions7d: null,
  ga4Users7d: null,
  ga4PageViews7d: null,
  gscClicks7d: null,
  gscImpressions7d: null,
  gscTopQueries: [],
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
  const topQueries = Array.isArray(metrics.gscTopQueries)
    ? (metrics.gscTopQueries as Array<{ query?: string; clicks?: number }>).slice(0, 5)
    : [];

  return {
    connected,
    metricDate: snap?.metric_date || null,
    syncedAt:
      (typeof metrics.syncedAt === "string" && metrics.syncedAt) ||
      conn?.last_sync_at ||
      snap?.created_at ||
      null,
    ga4Sessions7d: numOrNull(metrics.ga4Sessions7d),
    ga4Users7d: numOrNull(metrics.ga4Users7d),
    ga4PageViews7d: numOrNull(metrics.ga4PageViews7d),
    gscClicks7d: numOrNull(metrics.gscClicks7d),
    gscImpressions7d: numOrNull(metrics.gscImpressions7d),
    gscTopQueries: topQueries,
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
