/**
 * @deprecated Import from ./merch-feed — kept for backwards compatibility.
 */
export {
  MERCH_RAIL_KEYS as HOMEPAGE_FEED_RAIL_KEYS,
  type MerchRailKey as HomepageFeedRailKey,
  isMerchFeedEnabled as isHomepageFeedCacheEnabled,
  fetchMerchRailProducts as fetchHomepageFeedRail,
  fetchMerchFeedMeta as fetchHomepageFeedMeta,
  fetchMerchFeedMeta,
  fetchMerchRailDisplayCount,
  fetchMerchGlobalDisplayCount,
} from "./merch-feed";

import {
  MERCH_RAIL_KEYS,
  type MerchRailKey,
  fetchMerchFeedMeta,
} from "./merch-feed";
import { getServerSupabase } from "./supabase-server";

/** Head counts per rail_key — for /api/homepage-debug */
export async function fetchHomepageFeedItemCounts(): Promise<{
  counts: Partial<Record<MerchRailKey, number>>;
  errors: Partial<Record<MerchRailKey, string>>;
}> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { counts: {}, errors: { "top:new_in": "no_supabase_client" } };
  }

  const railKeys = [
    MERCH_RAIL_KEYS.newIn,
    MERCH_RAIL_KEYS.silk,
    MERCH_RAIL_KEYS.linen,
    MERCH_RAIL_KEYS.cashmere,
    MERCH_RAIL_KEYS.vacation,
    MERCH_RAIL_KEYS.sale,
  ] as MerchRailKey[];

  const results = await Promise.all(
    railKeys.map(async (railKey) => {
      const { count, error } = await supabase
        .from("homepage_feed_items")
        .select("rail_key", { count: "exact", head: true })
        .eq("rail_key", railKey);
      return { railKey, count: count ?? 0, error: error?.message };
    })
  );

  const counts: Partial<Record<MerchRailKey, number>> = {};
  const errors: Partial<Record<MerchRailKey, string>> = {};
  for (const r of results) {
    counts[r.railKey] = r.count;
    if (r.error) errors[r.railKey] = r.error;
  }
  return { counts, errors };
}

export type HomepageFeedMetaRow = {
  rail_key: string;
  row_count: number | null;
  source_rows: number | null;
  refresh_ms: number | null;
  refreshed_at: string | null;
  last_error: string | null;
};
