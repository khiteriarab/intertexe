"use server";

import { fetchFiberCounts } from "../../lib/supabase-server";
import { CATALOG_PAGE_SIZE } from "../../lib/catalog-rules";
import { getCachedCatalogStatsMemo, getShopCatalogKnownTotal } from "../../lib/cached-catalog-stats";
import { queryLiveCatalog } from "../../lib/catalog-direct-query";
import { isShoesCategory } from "../../lib/catalog-filter-options";
import {
  loadEditorPickShopLead,
  mergeShopWithEditorPicks,
  shouldLeadShopWithEditorPicks,
} from "../../lib/shop-editor-picks";

function isUnfilteredShopQuery(options: {
  fiber?: string;
  categories?: string[];
  brandSlugs?: string[];
  fiberSubtypes?: string[];
  fiberSubtype?: string;
  materialSubtype?: string;
  fabricConstruction?: string;
  fabricConstructions?: string[];
  color?: string;
  maxPrice?: number | null;
  minPrice?: number | null;
  search?: string;
}) {
  const subtype =
    options.materialSubtype || options.fiberSubtype || options.fiberSubtypes?.[0];
  const construction =
    options.fabricConstruction || options.fabricConstructions?.[0];
  return (
    (!options.fiber || options.fiber === "all") &&
    !options.categories?.length &&
    !options.brandSlugs?.length &&
    !subtype &&
    !construction &&
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
  materialSubtype?: string;
  fabricConstruction?: string;
  fabricConstructions?: string[];
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
  const subtype =
    options.materialSubtype || options.fiberSubtype || options.fiberSubtypes?.[0];
  const construction =
    options.fabricConstruction || options.fabricConstructions?.[0];

  try {
    const sortKey = options.sort === "recommended" ? "new" : options.sort;
    const leadPicks = shouldLeadShopWithEditorPicks({
      sort: sortKey,
      offset,
      fiber: options.fiber,
      categories: options.categories,
      brand: options.brandSlugs?.[0],
      search: options.search,
      color: options.color,
      materialSubtype: subtype,
      fabricConstruction: construction,
      minPrice: options.minPrice ?? undefined,
      maxPrice: options.maxPrice ?? undefined,
    });
    const needKnownTotal =
      !options.skipTotal && isUnfilteredShopQuery(options) && offset === 0;

    const shoes = options.categories?.some((c) => isShoesCategory(c));
    const [result, knownTotal, editorPicks] = await Promise.all([
      queryLiveCatalog({
        region: options.catalogRegion || "us",
        limit,
        offset,
        fiber: options.fiber && options.fiber !== "all" ? options.fiber : undefined,
        category: options.categories?.[0],
        sort: sortKey,
        search: options.search,
        color: options.color,
        materialSubtype: subtype,
        fabricConstruction: construction,
        brand: options.brandSlugs?.[0],
        minPrice: options.minPrice != null && options.minPrice > 0 ? options.minPrice : undefined,
        maxPrice: options.maxPrice ?? undefined,
        skipCount: options.skipTotal,
        type: shoes ? options.search : undefined,
        subcategory: shoes ? options.search : undefined,
        material: shoes
          ? options.fiber && options.fiber !== "all"
            ? options.fiber
            : subtype
          : undefined,
      }),
      needKnownTotal ? getShopCatalogKnownTotal() : Promise.resolve(null),
      leadPicks ? loadEditorPickShopLead(limit) : Promise.resolve([]),
    ]);

    const products = leadPicks
      ? mergeShopWithEditorPicks(result.products || [], editorPicks, limit)
      : result.products || [];

    return {
      products,
      total: knownTotal != null ? knownTotal : result.total ?? 0,
      hasMore: result.hasMore ?? false,
      error: result.error,
      productIds: products.map((p) => p.id),
      rpcVersion: result.rpcVersion ?? null,
      totalStatus: result.totalStatus ?? null,
      filterCoverage: result.filterCoverage ?? null,
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
  materialSubtype?: string;
  fabricConstruction?: string;
  fabricConstructions?: string[];
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
  return { total: result.total == null ? null : result.total };
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
