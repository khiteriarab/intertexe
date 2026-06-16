import { NextResponse } from "next/server";
import { getCachedPlatformStats } from "../../../lib/cached-catalog";
import { getCachedRegionalCatalogStats } from "../../../lib/regional-catalog-stats";
import {
  HOMEPAGE_STATS_REVALIDATE_SEC,
  STATS_CACHE_HEADERS,
} from "../../../lib/homepage-cache-config";

export const revalidate = HOMEPAGE_STATS_REVALIDATE_SEC;

export async function GET() {
  try {
    const [stats, regions] = await Promise.all([
      getCachedPlatformStats(),
      getCachedRegionalCatalogStats(),
    ]);

    return NextResponse.json(
      {
        productCount: stats.productCount,
        brandCount: stats.brandCount,
        regions,
        lastUpdated: new Date().toISOString(),
      },
      { headers: STATS_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("[api/stats]", error);
    return NextResponse.json({ error: "Failed to fetch catalog stats" }, { status: 500 });
  }
}
