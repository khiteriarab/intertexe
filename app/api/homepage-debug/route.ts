export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  HOMEPAGE_FEED_RAIL_KEYS,
  fetchHomepageFeedMeta,
  fetchHomepageFeedRail,
  isHomepageFeedCacheEnabled,
} from "../../../lib/homepage-feed";
import { getHomePageData } from "../../../lib/homepage-data";

export async function GET() {
  const useCache = isHomepageFeedCacheEnabled();

  if (useCache) {
    const [meta, newIn, silk, linen, cashmere, vacation, sale] = await Promise.all([
      fetchHomepageFeedMeta(),
      fetchHomepageFeedRail(HOMEPAGE_FEED_RAIL_KEYS.newIn),
      fetchHomepageFeedRail(HOMEPAGE_FEED_RAIL_KEYS.silk),
      fetchHomepageFeedRail(HOMEPAGE_FEED_RAIL_KEYS.linen),
      fetchHomepageFeedRail(HOMEPAGE_FEED_RAIL_KEYS.cashmere),
      fetchHomepageFeedRail(HOMEPAGE_FEED_RAIL_KEYS.vacation),
      fetchHomepageFeedRail(HOMEPAGE_FEED_RAIL_KEYS.sale),
    ]);

    return NextResponse.json({
      source: "homepage_feed_cache",
      HOMEPAGE_USE_FEED_CACHE: true,
      counts: {
        newIn: newIn.length,
        silk: silk.length,
        linen: linen.length,
        cashmere: cashmere.length,
        vacation: vacation.length,
        sale: sale.length,
      },
      meta,
    });
  }

  const data = await getHomePageData();
  return NextResponse.json({
    source: "live_catalog_fallback",
    HOMEPAGE_USE_FEED_CACHE: false,
    counts: {
      newIn: data.newInProducts.length,
      silk: data.silkProducts.length,
      linen: data.linenProducts.length,
      cashmere: data.cashmereProducts.length,
      vacation: data.vacationProducts.length,
      sale: data.saleProducts.length,
    },
  });
}
