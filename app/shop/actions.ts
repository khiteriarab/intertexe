"use server";

import { fetchProductCount, fetchFiberCounts } from "../../lib/supabase-server";
import { CATALOG_PAGE_SIZE } from "../../lib/catalog-rules";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com";

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
  const params = new URLSearchParams({
    region: options.catalogRegion || "us",
    limit: String(options.limit || CATALOG_PAGE_SIZE),
    offset: String(options.offset || 0),
  });

  if (options.fiber && options.fiber !== "all") params.set("fiber", options.fiber);
  if (options.categories?.length) params.set("category", options.categories[0]);
  if (options.sort && options.sort !== "recommended") params.set("sort", options.sort);
  if (options.search) params.set("q", options.search);
  if (options.color) params.set("color", options.color);
  const subtype = options.fiberSubtype || options.fiberSubtypes?.[0];
  if (subtype) params.set("fiberSubtype", subtype);
  if (options.minPrice != null && options.minPrice > 0) params.set("minPrice", String(options.minPrice));
  if (options.maxPrice && !options.price600Plus) params.set("maxPrice", String(options.maxPrice));
  if (options.price600Plus && options.minPrice) params.set("minPrice", String(options.minPrice));
  if (options.brandSlugs?.length) params.set("brand", options.brandSlugs[0]);

  const res = await fetch(`${SITE_URL}/api/catalog?${params}`, { cache: "no-store" });
  if (!res.ok) {
    return { products: [], total: 0, hasMore: false, error: "failed" as const };
  }
  return res.json();
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
  const [totalProductCount, fiberCounts] = await Promise.all([
    fetchProductCount(),
    fetchFiberCounts(),
  ]);
  return { totalProductCount, fiberCounts };
}
