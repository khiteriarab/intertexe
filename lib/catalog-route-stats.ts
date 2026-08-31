/**
 * Precomputed shop route counts — fiber hubs, taxonomy PLPs, catalog + shoes totals.
 * Written weekly by refresh-catalog-stats cron; read by GET /api/catalog/stats (iOS + web).
 */
import { getServerSupabase } from "./supabase-service-client";

export const CATALOG_ROUTE_STATS_KEY = "catalog_route_stats";

export type CatalogRouteStatsPayload = {
  version: 1;
  updatedAt: string;
  region: string;
  /** Deduped verified apparel shop-card total (catalog_list_count). */
  catalogTotal: number;
  shoesTotal: number;
  fiberCounts: Record<string, number>;
  taxonomyCounts: Record<string, number>;
};

export type CatalogRouteStatsReadResult = CatalogRouteStatsPayload & {
  source: "cache" | "unavailable";
  ageMs: number | null;
};

const MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;

function isValidPayload(value: unknown): value is CatalogRouteStatsPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as CatalogRouteStatsPayload;
  return (
    v.version === 1 &&
    typeof v.updatedAt === "string" &&
    typeof v.catalogTotal === "number" &&
    typeof v.shoesTotal === "number" &&
    v.fiberCounts != null &&
    typeof v.fiberCounts === "object" &&
    v.taxonomyCounts != null &&
    typeof v.taxonomyCounts === "object"
  );
}

/** Read cached route stats from system_status (service role). */
export async function readCatalogRouteStats(): Promise<CatalogRouteStatsReadResult | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("system_status")
      .select("value_json, updated_at")
      .eq("key", CATALOG_ROUTE_STATS_KEY)
      .maybeSingle();
    if (error || !data?.value_json || !isValidPayload(data.value_json)) return null;

    const payload = data.value_json as CatalogRouteStatsPayload;
    const updatedAt = payload.updatedAt || (data.updated_at ? String(data.updated_at) : null);
    const ageMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : null;
    if (ageMs != null && ageMs > MAX_AGE_MS) return null;

    return {
      ...payload,
      updatedAt: updatedAt ?? payload.updatedAt,
      source: "cache",
      ageMs,
    };
  } catch {
    return null;
  }
}

/** Persist precomputed route stats for fast API reads. */
export async function writeCatalogRouteStats(payload: CatalogRouteStatsPayload): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase unavailable");

  const { error } = await supabase.from("system_status").upsert(
    {
      key: CATALOG_ROUTE_STATS_KEY,
      value_json: payload,
      updated_at: payload.updatedAt,
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
}
