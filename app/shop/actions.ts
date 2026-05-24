"use server";

import {
  fetchShopProducts,
  fetchShopCatalogCount,
  fetchProductCount,
  fetchFiberCounts,
} from "../../lib/supabase-server";
import { CATALOG_PAGE_SIZE } from "../../lib/catalog-rules";

export async function getShopProducts(options: {
  fiber?: string;
  categories?: string[];
  brandSlugs?: string[];
  fiberSubtypes?: string[];
  maxPrice?: number | null;
  price600Plus?: boolean;
  market?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  search?: string;
  skipTotal?: boolean;
}) {
  return fetchShopProducts({
    fiber: options.fiber === "all" ? undefined : options.fiber,
    categories: options.categories?.filter((c) => c && c !== "all"),
    brandSlugs: options.brandSlugs?.filter(Boolean),
    fiberSubtypes: options.fiberSubtypes?.filter(Boolean),
    maxPrice: options.maxPrice ?? null,
    price600Plus: options.price600Plus,
    market: options.market === "all" ? undefined : options.market,
    sort: options.sort || "new",
    limit: options.limit || CATALOG_PAGE_SIZE,
    offset: options.offset || 0,
    search: options.search,
    skipTotal: options.skipTotal ?? options.offset === 0,
  });
}

export async function getShopCatalogCount(options: {
  fiber?: string;
  categories?: string[];
  brandSlugs?: string[];
  fiberSubtypes?: string[];
  maxPrice?: number | null;
  price600Plus?: boolean;
  market?: string;
  search?: string;
}) {
  const total = await fetchShopCatalogCount({
    fiber: options.fiber === "all" ? undefined : options.fiber,
    categories: options.categories?.filter((c) => c && c !== "all"),
    brandSlugs: options.brandSlugs?.filter(Boolean),
    fiberSubtypes: options.fiberSubtypes?.filter(Boolean),
    maxPrice: options.maxPrice ?? null,
    price600Plus: options.price600Plus,
    market: options.market === "all" ? undefined : options.market,
    search: options.search,
  });
  return { total };
}

export async function getShopBrands() {
  const { fetchShoppableBrands } = await import("../../lib/shoppable-brands");
  return fetchShoppableBrands();
}

export async function getShopMeta() {
  const [totalProductCount, fiberCounts] = await Promise.all([
    fetchProductCount(),
    fetchFiberCounts(),
  ]);
  return { totalProductCount, fiberCounts };
}
