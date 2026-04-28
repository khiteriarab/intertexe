"use server";

import { fetchShopProducts, fetchProductCount, fetchFiberCounts } from "../../lib/supabase-server";

export async function getShopProducts(options: {
  fiber?: string;
  category?: string;
  market?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  search?: string;
}) {
  const result = await fetchShopProducts({
    fiber: options.fiber === "all" ? undefined : options.fiber,
    category: options.category === "all" ? undefined : options.category,
    market: options.market === "all" ? undefined : options.market,
    sort: options.sort || "recommended",
    limit: options.limit || 40,
    offset: options.offset || 0,
    search: options.search,
  });
  return result;
}

export async function getShopMeta() {
  const [totalProductCount, fiberCounts] = await Promise.all([
    fetchProductCount(),
    fetchFiberCounts(),
  ]);
  return { totalProductCount, fiberCounts };
}
