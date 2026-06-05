"use server";

import { queryLiveCatalog } from "../../lib/catalog-direct-query";
import { fetchProductCount, fetchFiberCounts } from "../../lib/supabase-server";
import { CATALOG_PAGE_SIZE } from "../../lib/catalog-rules";

export async function getShopProducts(options: {
  fiber?: string;
  categories?: string[];
  brandSlugs?: string[];
  fiberSubtypes?: string[];
  maxPrice?: number | null;
  price600Plus?: boolean;
  market?: string;
  catalogRegion?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  search?: string;
  skipTotal?: boolean;
}) {
  const region = options.catalogRegion || "us";
  const categories = options.categories?.filter((c) => c && c !== "all");
  const brand = options.brandSlugs?.length === 1 ? options.brandSlugs[0] : undefined;

  return queryLiveCatalog({
    region,
    fiber: options.fiber === "all" ? undefined : options.fiber,
    categories,
    category: categories?.length === 1 ? categories[0] : undefined,
    brand,
    search: options.search,
    sort: options.sort === "recommended" ? "new" : options.sort || "new",
    maxPrice: options.price600Plus ? undefined : options.maxPrice ?? undefined,
    limit: options.limit || CATALOG_PAGE_SIZE,
    offset: options.offset || 0,
    skipCount: options.skipTotal ?? false,
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
  catalogRegion?: string;
}) {
  const region = options.catalogRegion || "us";
  const categories = options.categories?.filter((c) => c && c !== "all");
  const brand = options.brandSlugs?.length === 1 ? options.brandSlugs[0] : undefined;
  const result = await queryLiveCatalog({
    region,
    fiber: options.fiber === "all" ? undefined : options.fiber,
    categories,
    category: categories?.length === 1 ? categories[0] : undefined,
    brand,
    search: options.search,
    maxPrice: options.price600Plus ? undefined : options.maxPrice ?? undefined,
    limit: 1,
    offset: 0,
    skipCount: false,
  });
  return { total: result.total };
}

export async function getShopBrands() {
  const { fetchCatalogDesigners } = await import("../../lib/catalog-designers");
  return fetchCatalogDesigners("us");
}

export async function getShopMeta() {
  const [totalProductCount, fiberCounts] = await Promise.all([
    fetchProductCount(),
    fetchFiberCounts(),
  ]);
  return { totalProductCount, fiberCounts };
}
