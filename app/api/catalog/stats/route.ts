import { NextResponse, after } from "next/server";
import {
  CATALOG_ROUTE_STATS_FRESH_MS,
  readCatalogRouteStats,
  readLiveOfferTotal,
} from "../../../../lib/catalog-route-stats";
import { refreshCatalogRouteStats } from "../../../../lib/refresh-catalog-route-stats";

export const revalidate = 3600;
export const maxDuration = 10;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, max-age=3600",
};

function emptyStats(region: string) {
  return {
    version: 1 as const,
    updatedAt: null as string | null,
    region,
    catalogTotal: 0,
    shoesTotal: 0,
    fiberCounts: {} as Record<string, number>,
    taxonomyCounts: {} as Record<string, number>,
    shopCardTotal: 0,
    source: "unavailable" as const,
  };
}

/**
 * Precomputed shop route counts — fiber hubs, taxonomy PLPs, catalog + shoes totals.
 *
 * Never recompute inline: refresh-catalog-stats is unscheduled during Fluid
 * lockdown, and a sync refresh routinely hits maxDuration (504) under the 5s
 * Supabase abort — which cancels iOS Inspirations / Shop loads.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const region = (params.get("region") || "us").toLowerCase();

  const stats = await readCatalogRouteStats({ allowStale: true });
  const needsRefresh =
    !stats ||
    stats.region !== region ||
    (stats.ageMs != null && stats.ageMs > CATALOG_ROUTE_STATS_FRESH_MS);

  if (needsRefresh) {
    // Best-effort background refresh — never await on the request path.
    after(() => {
      void refreshCatalogRouteStats(region).catch((err) => {
        console.warn(
          "[catalog/stats] background refresh failed:",
          err instanceof Error ? err.message : err
        );
      });
    });
  }

  if (!stats) {
    return NextResponse.json(emptyStats(region), {
      status: 200,
      headers: {
        ...CACHE_HEADERS,
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
      },
    });
  }

  // Prefer a fast cache read for the marketing total; never block on miss.
  const liveOfferTotal = await readLiveOfferTotal().catch(() => null);
  const catalogTotal = liveOfferTotal ?? stats.catalogTotal;
  const taxonomyCounts = { ...stats.taxonomyCounts };
  if (catalogTotal > 0) {
    taxonomyCounts["clothing/all"] = catalogTotal;
  }

  return NextResponse.json(
    {
      version: stats.version,
      updatedAt: stats.updatedAt,
      region: stats.region,
      catalogTotal,
      shoesTotal: stats.shoesTotal,
      fiberCounts: stats.fiberCounts,
      taxonomyCounts,
      shopCardTotal: stats.catalogTotal,
      source: stats.source,
      stale: Boolean(needsRefresh),
    },
    { headers: CACHE_HEADERS }
  );
}
