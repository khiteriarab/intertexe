/**
 * Authoritative shop browse — same `catalog_browse_page_v2` as iOS.
 *
 * Parity rule: for identical RPC params, product IDs must match iOS in order.
 * Do not post-filter, reorder, or broaden results after the RPC returns.
 */
import { getServerSupabase } from "./supabase-service-client";

export type CatalogBrowseV2Opts = {
  region?: string;
  limit?: number;
  offset?: number;
  /** Material family: silk, linen, cotton, wool, cashmere, leather (+ leather_suede alias) */
  fiber?: string;
  category?: string;
  brand?: string;
  q?: string;
  search?: string;
  sort?: string;
  maxPrice?: number;
  minPrice?: number;
  color?: string;
  materialSubtype?: string;
  fabricConstruction?: string;
  includeUnverified?: boolean;
  /** When true (default), apparel-only PLP uses category=clothing like iOS. */
  apparelOnly?: boolean;
};

export type CatalogBrowseProduct = {
  id: string;
  brandSlug: string;
  brandName: string;
  name: string;
  productId: string;
  url: string;
  imageUrl: string;
  price: string;
  composition: string;
  naturalFiberPercent: number;
  category: string;
  matchingSetId: string | null;
  isSale: boolean;
  originalPrice: string | null;
  listingRegion: string | null;
  stockStatus: string | null;
  isEditorPick?: boolean;
  editorPickedAt?: string | null;
  materialSubtype?: string | null;
  fabricConstruction?: string | null;
  shopMaterialFamily?: string | null;
};

export type CatalogFilterCoverage = {
  materialFamily: number;
  materialPrimaryClassified: number;
  materialSubtype: number;
  fabricConstruction: number;
  color: number;
};

export type CatalogBrowseV2Result = {
  products: CatalogBrowseProduct[];
  /** Exact IDs in RPC order — use for cross-platform parity tests. */
  productIds: string[];
  total: number | null;
  hasMore: boolean;
  totalStatus: "exact" | "cached" | "estimated" | "unavailable";
  verifiedTotal: number | null;
  unverifiedTotal: number;
  matchQuality: string;
  filterCoverage: CatalogFilterCoverage | null;
  sparseFilters: string[];
  emptyReason: string | null;
  rpcVersion: string;
  /** Exact params sent to the RPC (for parity / debugging). */
  rpcParams: Record<string, unknown>;
  /** Present when the RPC failed or timed out — never treat as an empty catalog. */
  error?: "failed" | "timeout";
};

/** Mirror of iOS CatalogBrowseRequest → RPC Params. Single source for web↔iOS parity. */
export function buildCatalogBrowseV2Params(opts: CatalogBrowseV2Opts): Record<string, unknown> {
  const regionRaw = (opts.region || "us").toLowerCase();
  const region = regionRaw === "all" ? "us" : regionRaw;
  const limit = Math.min(Math.max(opts.limit ?? 48, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  let family = normalizeMaterialFamily(opts.fiber);
  let construction = normalizeSlug(opts.fabricConstruction);
  // Denim is fabric_construction only (matches server + iOS).
  if (opts.fiber?.toLowerCase() === "denim" || construction === "denim") {
    construction = "denim";
    family = null;
  }

  const categoryRaw =
    opts.category && opts.category !== "all" && opts.category !== "apparel"
      ? opts.category.toLowerCase().trim()
      : null;
  const apparelOnly = opts.apparelOnly !== false;
  const category = categoryRaw || (apparelOnly ? "clothing" : null);
  const search = (opts.q || opts.search || "").trim() || null;

  return {
    p_region: region,
    p_category: category,
    p_material_family: family,
    p_material_subtype: normalizeSlug(opts.materialSubtype),
    p_fabric_construction: construction,
    p_min_nfp: family ? 80 : null,
    p_max_synthetic: null,
    p_color: opts.color ? opts.color.toLowerCase().trim() : null,
    p_brand_slug: opts.brand?.trim().toLowerCase() || null,
    p_search: search,
    p_min_price: opts.minPrice != null && opts.minPrice > 0 ? opts.minPrice : null,
    p_max_price: opts.maxPrice != null && opts.maxPrice > 0 ? opts.maxPrice : null,
    p_include_unverified: Boolean(opts.includeUnverified),
    p_sort: mapSort(opts.sort),
    p_limit: limit,
    p_offset: offset,
  };
}

function normalizeMaterialFamily(fiber?: string): string | null {
  if (!fiber || fiber === "all") return null;
  const f = fiber.toLowerCase().trim();
  if (f === "leather_suede" || f === "suede" || f === "leather") return "leather";
  if (f === "denim") return null;
  return f;
}

function normalizeSlug(value?: string | null): string | null {
  if (!value) return null;
  const slug = value.trim().toLowerCase().replace(/\s+/g, "_");
  return slug || null;
}

function mapSort(sort?: string): string {
  switch (sort) {
    case "price-low":
    case "price_asc":
    case "priceLowHigh":
    case "Price: Low to High":
      return "price_asc";
    case "price-high":
    case "price_desc":
    case "priceHighLow":
    case "Price: High to Low":
      return "price_desc";
    case "natural-high":
    case "most_natural":
    case "mostNatural":
    case "Most Natural":
      return "most_natural";
    default:
      return "newest";
  }
}

function mapProductRow(row: Record<string, unknown>): CatalogBrowseProduct {
  const nfp = Number(row.natural_fiber_percent ?? 0);
  return {
    id: String(row.id ?? ""),
    brandSlug: String(row.brand_slug ?? ""),
    brandName: String(row.brand_name ?? ""),
    name: String(row.name ?? ""),
    productId: String(row.product_id ?? row.id ?? ""),
    url: String(row.url ?? ""),
    imageUrl: String(row.image_url ?? ""),
    price: String(row.price ?? ""),
    composition: String(row.composition ?? ""),
    naturalFiberPercent: Number.isFinite(nfp) ? Math.round(nfp) : 0,
    category: String(row.category ?? ""),
    matchingSetId: row.matching_set_id != null ? String(row.matching_set_id) : null,
    isSale: row.is_sale === true,
    originalPrice: row.original_price != null ? String(row.original_price) : null,
    listingRegion: row.region != null ? String(row.region) : null,
    stockStatus:
      row.stock_status != null && String(row.stock_status).trim()
        ? String(row.stock_status).trim()
        : null,
    isEditorPick: row.is_editor_pick === true,
    editorPickedAt: row.editor_picked_at != null ? String(row.editor_picked_at) : null,
    materialSubtype: row.material_subtype != null ? String(row.material_subtype) : null,
    fabricConstruction: row.fabric_construction != null ? String(row.fabric_construction) : null,
    shopMaterialFamily: row.shop_material_family != null ? String(row.shop_material_family) : null,
  };
}

function mapCoverage(raw: unknown): CatalogFilterCoverage | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  return {
    materialFamily: Number(c.material_family ?? 0),
    materialPrimaryClassified: Number(c.material_primary_classified ?? 0),
    materialSubtype: Number(c.material_subtype ?? 0),
    fabricConstruction: Number(c.fabric_construction ?? 0),
    color: Number(c.color ?? 0),
  };
}

/**
 * Call catalog_browse_page_v2. Returns products in exact server order.
 * Never weakens, drops, or reorders results client-side.
 * Exception: US brand/search with zero rows retries UK once (UK-only labels).
 */
export async function queryCatalogBrowsePageV2(
  opts: CatalogBrowseV2Opts
): Promise<CatalogBrowseV2Result> {
  const primary = await queryCatalogBrowsePageV2Once(opts);
  if (primary.error) return primary;

  const region = (opts.region || "us").toLowerCase();
  const hasBrandOrSearch = Boolean(
    opts.brand?.trim() || (opts.q || opts.search || "").trim()
  );
  if (
    region === "us" &&
    hasBrandOrSearch &&
    primary.products.length === 0 &&
    !primary.error
  ) {
    return queryCatalogBrowsePageV2Once({ ...opts, region: "uk" });
  }
  return primary;
}

async function queryCatalogBrowsePageV2Once(
  opts: CatalogBrowseV2Opts
): Promise<CatalogBrowseV2Result> {
  const rpcParams = buildCatalogBrowseV2Params(opts);
  const failed = (): CatalogBrowseV2Result => ({
    products: [],
    productIds: [],
    total: null,
    hasMore: false,
    totalStatus: "unavailable",
    verifiedTotal: null,
    unverifiedTotal: 0,
    matchQuality: "none",
    filterCoverage: null,
    sparseFilters: [],
    emptyReason: "rpc_failed",
    rpcVersion: "catalog_browse_page_v2",
    rpcParams,
    error: "failed",
  });

  const supabase = getServerSupabase();
  if (!supabase) return failed();

  try {
    const { data, error } = await supabase.rpc("catalog_browse_page_v2", rpcParams);
    if (error) throw error;

    const payload = (data ?? {}) as Record<string, unknown>;
    const rows = Array.isArray(payload.products) ? payload.products : [];
    // Preserve exact RPC order — no consumer post-filter (parity with iOS authoritative path).
    const products = rows.map((row) => mapProductRow(row as Record<string, unknown>));
    const productIds = products.map((p) => p.id).filter(Boolean);

    const totalStatus = String(payload.total_status ?? "unavailable") as CatalogBrowseV2Result["totalStatus"];
    const verifiedTotal =
      payload.verified_total == null ? null : Number(payload.verified_total);
    const totalRaw = payload.total == null ? null : Number(payload.total);
    const total = totalStatus === "exact" ? totalRaw ?? verifiedTotal : null;
    const debug = (payload.debug ?? {}) as Record<string, unknown>;

    const emptyReason =
      payload.empty_reason != null ? String(payload.empty_reason) : null;
    const matchQuality = String(payload.match_quality ?? "verified");
    const rpcError = payload.error as { code?: string; message?: string } | null;
    const isTimeout =
      emptyReason === "request_timeout" ||
      matchQuality === "error" ||
      rpcError?.code === "timeout";

    return {
      products: isTimeout ? [] : products,
      productIds: isTimeout ? [] : productIds,
      total: isTimeout ? null : total,
      hasMore: isTimeout ? false : Boolean(payload.has_more),
      totalStatus: isTimeout ? "unavailable" : totalStatus,
      verifiedTotal: isTimeout ? null : verifiedTotal,
      unverifiedTotal: Number(payload.unverified_total ?? 0),
      matchQuality: isTimeout ? "error" : matchQuality,
      filterCoverage: mapCoverage(payload.filter_coverage),
      sparseFilters: Array.isArray(payload.sparse_filters)
        ? payload.sparse_filters.map(String)
        : [],
      emptyReason: isTimeout ? "request_timeout" : emptyReason,
      rpcVersion: String(debug.rpc_version ?? "catalog_browse_page_v2"),
      rpcParams,
      error: isTimeout ? "timeout" : undefined,
    };
  } catch (err) {
    console.error("[queryCatalogBrowsePageV2]", err);
    const message = String((err as { message?: string })?.message ?? err ?? "");
    const isTimeout =
      message.includes("statement timeout") ||
      message.includes("canceling statement") ||
      message.includes("57014") ||
      message.toLowerCase().includes("timeout");
    return {
      ...failed(),
      emptyReason: isTimeout ? "request_timeout" : "rpc_failed",
      matchQuality: "error",
      error: isTimeout ? "timeout" : "failed",
    };
  }
}

export function shouldUseAuthoritativeBrowse(opts: {
  collection?: string;
  isSale?: boolean;
}): boolean {
  return !opts.collection && !opts.isSale;
}
