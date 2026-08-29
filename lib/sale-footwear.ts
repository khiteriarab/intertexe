/**
 * Sale footwear — `live_products_footwear` with markdown detection (is_sale OR original > price).
 * Apparel sale RPCs exclude shoes; this path mirrors iOS `fetchSaleFootwear`.
 */
import { getServerSupabase, mapProductRow, type Product } from "./supabase-server";
import { filterConsumerCatalogProducts } from "./catalog-consumer-guard";
import { FOOTWEAR_SELECT } from "./footwear-catalog";
import { canonicalProductId } from "./canonical-product-id";

function parseMoneyValue(val: unknown): number {
  if (val == null) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function isFootwearOfferOnSale(row: {
  isSale?: boolean;
  is_sale?: boolean;
  price?: string | null;
  originalPrice?: string | null;
  original_price?: string | null;
}): boolean {
  if (row.isSale === true || row.is_sale === true) return true;
  const curr = parseMoneyValue(row.price);
  const orig = parseMoneyValue(row.originalPrice ?? row.original_price);
  return orig > curr && curr > 0;
}

function dedupeSaleFootwear(rows: Product[], limit: number): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const product of rows) {
    const key = canonicalProductId(product) || product.productId || product.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(product);
    if (out.length >= limit) break;
  }
  return out;
}

function saleDiscountPercent(product: Product): number {
  const orig = parseMoneyValue(product.originalPrice);
  const curr = parseMoneyValue(product.price);
  if (!orig || !curr || orig <= curr) return 0;
  return Math.round(((orig - curr) / orig) * 100);
}

function sortSaleFootwear(products: Product[], sort?: string): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-low":
      return list.sort((a, b) => parseMoneyValue(a.price) - parseMoneyValue(b.price));
    case "price-high":
      return list.sort((a, b) => parseMoneyValue(b.price) - parseMoneyValue(a.price));
    case "natural":
    case "natural-high":
      return list.sort(
        (a, b) => (b.naturalFiberPercent ?? 0) - (a.naturalFiberPercent ?? 0)
      );
    case "new":
      return list;
    case "discount":
    default:
      return list.sort((a, b) => saleDiscountPercent(b) - saleDiscountPercent(a));
  }
}

function applyClientFilters(
  products: Product[],
  opts: {
    brand?: string;
    color?: string;
    maxPrice?: number;
    minPrice?: number;
  }
): Product[] {
  let filtered = products;
  if (opts.color) {
    const c = opts.color.toLowerCase();
    filtered = filtered.filter((p) => String(p.color || "").toLowerCase() === c);
  }
  if (opts.brand) {
    const slug = opts.brand.toLowerCase();
    filtered = filtered.filter((p) => (p.brandSlug || "").toLowerCase() === slug);
  }
  if (opts.minPrice) {
    filtered = filtered.filter((p) => parseMoneyValue(p.price) >= opts.minPrice!);
  }
  if (opts.maxPrice) {
    filtered = filtered.filter((p) => {
      const pr = parseMoneyValue(p.price);
      return pr > 0 && pr <= opts.maxPrice!;
    });
  }
  return filtered;
}

/** Pull sale candidates from live footwear view, then apply on-sale + consumer guards. */
export async function fetchSaleFootwearPage(opts?: {
  region?: string;
  limit?: number;
  offset?: number;
  brand?: string;
  color?: string;
  maxPrice?: number;
  minPrice?: number;
  sort?: string;
  skipTotal?: boolean;
}): Promise<{ products: Product[]; total: number | null; hasMore: boolean }> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: 0, hasMore: false };

  const region = (opts?.region || "us").toLowerCase();
  const limit = Math.min(Math.max(opts?.limit ?? 24, 1), 100);
  const offset = Math.max(opts?.offset ?? 0, 0);
  const sort = opts?.sort || "discount";
  const scanSize = Math.min(Math.max(limit * 4, 96), 400);

  let rawRows: Record<string, unknown>[] = [];

  try {
    const { data, error } = await supabase.rpc("sale_footwear_catalog_list", {
      p_region: region,
      p_limit: scanSize,
      p_offset: offset,
    });
    if (!error && data?.length) rawRows = data as Record<string, unknown>[];
  } catch {
    // fall through to direct query
  }

  if (!rawRows.length) {
    let q = supabase
      .from("live_products_footwear")
      .select(FOOTWEAR_SELECT)
      .eq("region", region)
      .not("image_url", "is", null)
      .not("price", "is", null)
      .or("is_sale.eq.true,original_price.not.is.null")
      .order("natural_fiber_percent", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + scanSize - 1);
    if (opts?.color) q = q.eq("color", opts.color);
    if (opts?.brand) q = q.eq("brand_slug", opts.brand.toLowerCase());
    const { data, error } = await q;
    if (error) throw error;
    rawRows = (data || []) as Record<string, unknown>[];
  }

  let products = filterConsumerCatalogProducts(rawRows.map(mapProductRow)).filter(
    (p) => isFootwearOfferOnSale(p) && p.imageUrl && p.price
  );
  products = applyClientFilters(products, opts);
  products = sortSaleFootwear(products, sort);
  products = dedupeSaleFootwear(products, limit);

  if (opts?.skipTotal) {
    return {
      products,
      total: null,
      hasMore: rawRows.length >= scanSize || products.length >= limit,
    };
  }

  let total: number | null = null;
  try {
    const { data: countData, error: countErr } = await supabase.rpc("sale_footwear_catalog_count", {
      p_region: region,
    });
    if (!countErr && countData != null) total = Number(countData) || products.length;
  } catch {
    // ignore
  }

  if (total == null) {
    total = offset + products.length + (products.length >= limit ? 1 : 0);
  }

  return {
    products,
    total,
    hasMore: products.length >= limit || offset + products.length < total,
  };
}
