import { NextResponse } from "next/server";
import { readCatalogRouteStats } from "../../../../lib/catalog-route-stats";
import { refreshCatalogRouteStats } from "../../../../lib/refresh-catalog-route-stats";

export const revalidate = 3600;
export const maxDuration = 120;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, max-age=3600",
};

/** Precomputed shop route counts — fiber hubs, taxonomy PLPs, catalog + shoes totals. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const region = (params.get("region") || "us").toLowerCase();

  let stats = await readCatalogRouteStats();
  if (!stats || stats.region !== region) {
    try {
      const refreshed = await refreshCatalogRouteStats(region);
      stats = {
        ...refreshed,
        source: "cache" as const,
        ageMs: 0,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "catalog stats unavailable";
      return NextResponse.json({ error: message, source: "unavailable" }, { status: 503 });
    }
  }

  return NextResponse.json(
    {
      version: stats.version,
      updatedAt: stats.updatedAt,
      region: stats.region,
      catalogTotal: stats.catalogTotal,
      shoesTotal: stats.shoesTotal,
      fiberCounts: stats.fiberCounts,
      taxonomyCounts: stats.taxonomyCounts,
      source: stats.source,
    },
    { headers: CACHE_HEADERS }
  );
}
