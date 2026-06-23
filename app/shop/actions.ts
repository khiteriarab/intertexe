"use server";

import { fetchFiberCounts } from "../../lib/supabase-server";
import { CATALOG_PAGE_SIZE } from "../../lib/catalog-rules";
import { getCachedCatalogStatsMemo, getShopCatalogKnownTotal } from "../../lib/cached-catalog-stats";
import { queryLiveCatalog } from "../../lib/catalog-direct-query";

function isUnfilteredShopQuery(options: {
  fiber?: string;
  categories?: string[];
  brandSlugs?: string[];
  fiberSubtypes?: string[];
  fiberSubtype?: string;
  color?: string;
  maxPrice?: number | null;
  minPrice?: number | null;
  search?: string;
}) {
  const subtype = options.fiberSubtype || options.fiberSubtypes?.[0];
  return (
    (!options.fiber || options.fiber === "all") &&
    !options.categories?.length &&
    !options.brandSlugs?.length &&
    !subtype &&
    !options.color &&
    options.maxPrice == null &&
    options.minPrice == null &&
    !options.search
  );
}

export async function getShopProducts(options: {
  fiber?: string;
  categories?: string[];
  brandSlugs?: string[];
  fiberSubtypes?: string[];
  fiberSubtype?: string;
  color?: string;
  maxPrice?: number | null;
  minPrice?: number | null;
  price600Plus?: boolean;
  market?: string;
  catalogRegion?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  search?: string;
  skipTotal?: boolean;
}) {
  const offset = options.offset || 0;
  const limit = options.limit || CATALOG_PAGE_SIZE;
  const subtype = options.fiberSubtype || options.fiberSubtypes?.[0];

  try {
    const result = await queryLiveCatalog({
      region: options.catalogRegion || "us",
      limit,
      offset,
      fiber: options.fiber && options.fiber !== "all" ? options.fiber : undefined,
      category: options.categories?.[0],
      sort: options.sort === "recommended" ? "new" : options.sort,
      search: options.search,
      color: options.color,
      fiberSubtype: subtype,
      brand: options.brandSlugs?.[0],
      minPrice: options.minPrice != null && options.minPrice > 0 ? options.minPrice : undefined,
      maxPrice: options.maxPrice ?? undefined,
      skipCount: options.skipTotal,
    });

    let total = result.total ?? 0;
    if (!options.skipTotal && isUnfilteredShopQuery(options) && offset === 0) {
      total = await getShopCatalogKnownTotal();
    }

    return {
      products: result.products || [],
      total,
      hasMore: result.hasMore ?? false,
      error: result.error,
    };
  } catch {
    return { products: [], total: 0, hasMore: false, error: "failed" as const };
  }
}

export async function getShopCatalogCount(options: {
  fiber?: string;
  categories?: string[];
  brandSlugs?: string[];
  fiberSubtypes?: string[];
  fiberSubtype?: string;
  color?: string;
  maxPrice?: number | null;
  minPrice?: number | null;
  price600Plus?: boolean;
  market?: string;
  search?: string;
  catalogRegion?: string;
}) {
  const result = await getShopProducts({
    ...options,
    limit: 1,
    offset: 0,
    skipTotal: false,
  });
  return { total: result.total ?? 0 };
}

export async function getShopBrands() {
  const { fetchCatalogDesigners } = await import("../../lib/catalog-designers");
  return fetchCatalogDesigners("us");
}

export async function getShopMeta() {
  const [catalogStats, fiberCounts] = await Promise.all([
    getCachedCatalogStatsMemo(),
    fetchFiberCounts(),
  ]);
  return {
    totalProductCount: catalogStats.catalogProductCount,
    fiberCounts,
  };
}
