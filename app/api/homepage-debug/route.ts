export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  HOMEPAGE_FEED_RAIL_KEYS,
  fetchHomepageFeedItemCounts,
  fetchHomepageFeedMeta,
  isHomepageFeedCacheEnabled,
} from "../../../lib/homepage-feed";

/** Lightweight cache health check — homepage_feed_meta + per-rail counts only. */
export async function GET() {
  const envFlag = process.env.HOMEPAGE_USE_FEED_CACHE ?? "";

  const [meta, { counts, errors }] = await Promise.all([
    fetchHomepageFeedMeta(),
    fetchHomepageFeedItemCounts(),
  ]);

  return NextResponse.json({
    source: "homepage_feed_cache",
    HOMEPAGE_USE_FEED_CACHE: envFlag,
    HOMEPAGE_USE_FEED_CACHE_enabled: isHomepageFeedCacheEnabled(),
    counts: {
      newIn: counts[HOMEPAGE_FEED_RAIL_KEYS.newIn] ?? 0,
      silk: counts[HOMEPAGE_FEED_RAIL_KEYS.silk] ?? 0,
      linen: counts[HOMEPAGE_FEED_RAIL_KEYS.linen] ?? 0,
      cashmere: counts[HOMEPAGE_FEED_RAIL_KEYS.cashmere] ?? 0,
      vacation: counts[HOMEPAGE_FEED_RAIL_KEYS.vacation] ?? 0,
      sale: counts[HOMEPAGE_FEED_RAIL_KEYS.sale] ?? 0,
    },
    countsByRailKey: counts,
    countErrors: Object.keys(errors).length > 0 ? errors : undefined,
    meta,
  });
}
