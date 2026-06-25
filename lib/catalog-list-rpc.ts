/**
 * Fast shop catalog via catalog_list / catalog_list_count RPCs (same path as iOS).
 */
import { getServerSupabase } from "./supabase-service-client";
import { filterConsumerCatalogProducts } from "./catalog-consumer-guard";

export type CatalogListRPCOpts = {
  region?: string;
  limit?: number;
  offset?: number;
  fiber?: string;
  category?: string;
  categories?: string[];
  brand?: string;
  q?: string;
  search?: string;
  maxPrice?: number;
  minPrice?: number;
  skipCount?: boolean;
};

export type CatalogListRPCProduct = {
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
};

function parseMoney(price: unknown): number {
  const n = parseFloat(String(price ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function mapRpcRow(row: Record<string, unknown>): CatalogListRPCProduct {
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
  };
}

function rpcCategory(opts: CatalogListRPCOpts): string | null {
  if (opts.category && opts.category !== "all") return opts.category;
  const cats = opts.categories?.filter((c) => c && c !== "all") ?? [];
  return cats.length === 1 ? cats[0] : null;
}

function applyClientFilters(
  products: CatalogListRPCProduct[],
  opts: CatalogListRPCOpts
): CatalogListRPCProduct[] {
  let rows = products;
  if (opts.maxPrice != null && opts.maxPrice > 0) {
    rows = rows.filter((row) => {
      const p = parseMoney(row.price);
      return p > 0 && p <= opts.maxPrice!;
    });
  }
  if (opts.minPrice != null && opts.minPrice > 0) {
    rows = rows.filter((row) => parseMoney(row.price) >= opts.minPrice!);
  }
  return rows;
}

export async function queryCatalogListRPC(opts: CatalogListRPCOpts): Promise<{
  products: CatalogListRPCProduct[];
  total: number | null;
  hasMore: boolean;
  error?: "failed";
}> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: null, hasMore: false, error: "failed" };

  const region = (opts.region || "us").toLowerCase();
  const limit = Math.min(Math.max(opts.limit ?? 48, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const fiber = opts.fiber && opts.fiber !== "all" ? opts.fiber.toLowerCase() : null;
  const category = rpcCategory(opts);
  const brand = opts.brand?.trim() || null;
  const search = (opts.q || opts.search || "").trim() || null;

  try {
    const { data, error } = await supabase.rpc("catalog_list", {
      p_preferred_region: region,
      p_fallback_region: "us",
      p_fiber: fiber,
      p_category: category,
      p_brand_slug: brand,
      p_search: search,
      p_min_nfp: 80,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;

    let products = filterConsumerCatalogProducts(
      (data || []).map((row: Record<string, unknown>) => mapRpcRow(row))
    );
    products = applyClientFilters(products, opts);

    let total: number | null = null;
    if (!opts.skipCount) {
      const { data: count, error: countError } = await supabase.rpc("catalog_list_count", {
        p_preferred_region: region,
        p_fallback_region: "us",
        p_fiber: fiber,
        p_category: category,
        p_brand_slug: brand,
        p_search: search,
        p_min_nfp: 80,
      });
      if (!countError && count != null) {
        total = Number(count);
      }
    }

    if (total == null) {
      total = offset + products.length + (products.length >= limit ? 1 : 0);
    }

    return {
      products,
      total,
      hasMore: products.length >= limit || (total != null && offset + products.length < total),
    };
  } catch (err) {
    console.error("[queryCatalogListRPC]", err);
    return { products: [], total: null, hasMore: false, error: "failed" };
  }
}
