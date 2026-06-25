/**
 * Direct live_products_apparel queries — no catalog_list RPC, no fetchShopProducts scan.
 */
import { getServerSupabase } from "./supabase-service-client";
import { filterConsumerCatalogProducts } from "./catalog-consumer-guard";
import { applyCategoryFilter, CATEGORY_TO_GARMENT_TYPE } from "./catalog-shop-mappings";
import { queryCatalogListRPC } from "./catalog-list-rpc";

const CATALOG_TABLE = "live_products_apparel";

export { CATEGORY_TO_GARMENT_TYPE, applyCategoryFilter };

/** Editorial slug → all DB slugs that qualify for that collection. */
export const COLLECTION_CANONICAL_SLUGS: Record<string, string[]> = {
  vacation: ["vacation", "vacation-shop", "vacation-edit"],
  evening: ["evening", "occasion-edit", "silk-occasion", "evening-edit"],
  tailoring: ["tailoring", "tailoring-edit"],
  "summer-in-the-city": ["summer-in-the-city", "city-wardrobe"],
  "white-edit": ["white-edit", "the-white-edit"],
};

const WHITE_EDIT_COLORS = ["white", "ivory", "cream", "ecru", "off-white"];

export function applyCollectionFilter(query: any, collection: string): any {
  const slugs = COLLECTION_CANONICAL_SLUGS[collection] || [collection];
  const slugConditions = slugs.map((slug) => `collection_slugs.cs.{${slug}}`);
  if (collection === "white-edit") {
    slugConditions.push(`color.in.(${WHITE_EDIT_COLORS.join(",")})`);
  }
  return query.or(slugConditions.join(","));
}

export type DirectCatalogProduct = {
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

export type CatalogDirectQueryOpts = {
  region?: string;
  limit?: number;
  offset?: number;
  fiber?: string;
  category?: string;
  categories?: string[];
  collection?: string;
  brand?: string;
  q?: string;
  search?: string;
  sort?: string;
  maxPrice?: number;
  minPrice?: number;
  color?: string;
  fiberSubtype?: string;
  isSale?: boolean;
  skipCount?: boolean;
};

function parseMoney(price: unknown): number {
  const n = parseFloat(String(price ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function applySort(query: any, sort?: string) {
  switch (sort) {
    case "price-low":
      return query.order("price", { ascending: true });
    case "price-high":
      return query.order("price", { ascending: false });
    case "natural-high":
      return query.order("natural_fiber_percent", { ascending: false });
    case "recommended":
    case "new":
    default:
      return query.order("id", { ascending: false });
  }
}

export async function queryLiveCatalog(opts: CatalogDirectQueryOpts): Promise<{
  products: DirectCatalogProduct[];
  total: number | null;
  hasMore: boolean;
  error?: "failed";
}> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: 0, hasMore: false, error: "failed" };

  const region = (opts.region || "us").toLowerCase();
  const limit = Math.min(Math.max(opts.limit ?? 48, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const searchText = (opts.q || opts.search || "").trim();
  const categories = opts.categories?.length
    ? opts.categories.filter((c) => c && c !== "all")
    : opts.category && opts.category !== "all"
      ? [opts.category]
      : [];

  const hasNarrowingFilter = Boolean(
    opts.fiber ||
    opts.fiberSubtype ||
    categories.length ||
    opts.collection ||
    opts.brand ||
    searchText.length >= 2 ||
    opts.color ||
    opts.isSale ||
    opts.maxPrice ||
    opts.minPrice
  );
  const useExactCount = false;

  const canUseCatalogListRPC =
    !opts.isSale &&
    !opts.collection &&
    !opts.color &&
    !opts.fiberSubtype;

  try {
    // Consumer catalog — use indexed catalog_list RPC (same as iOS; direct view scan times out).
    if (canUseCatalogListRPC && (!hasNarrowingFilter || opts.fiber || categories.length === 1 || opts.brand || searchText.length >= 2)) {
      const rpc = await queryCatalogListRPC(opts);
      if (!rpc.error && rpc.products.length > 0) return rpc;
      if (!hasNarrowingFilter && !rpc.error) return rpc;
    }

    // Consumer catalog only — scoped view (composition, womenswear, active, NFP ≥ 80).
    if (!hasNarrowingFilter && !opts.isSale) {
      let pq = supabase
        .from(CATALOG_TABLE)
        .select("*")
        .eq("region", region)
        .not("image_url", "is", null)
        .not("price", "is", null);
      pq = applySort(pq, opts.sort);
      const { data, error } = await pq.range(offset, offset + limit - 1);
      if (error) throw error;
      const products = filterConsumerCatalogProducts(
        (data || []).map((row: any) => mapDirectRow(row as Record<string, unknown>))
      );
      return {
        products,
        total: offset + products.length + (products.length >= limit ? 1 : 0),
        hasMore: products.length >= limit,
      };
    }


    // Fiber pages — query scoped live view (not raw products).
    if (opts.fiber && opts.fiber !== "all" && !opts.isSale && !opts.collection) {
      const f = opts.fiber.toLowerCase();
      let fq = supabase
        .from(CATALOG_TABLE)
        .select("*")
        .eq("region", region)
        .not("image_url", "is", null)
        .not("price", "is", null);
      if (f === "leather" || f === "leather_suede") {
        fq = fq.or("composition.ilike.%leather%,composition.ilike.%suede%");
      } else {
        fq = fq.ilike("composition", `%${f}%`);
      }
      fq = applySort(fq, opts.sort);
      const { data, error } = await fq.range(offset, offset + limit - 1);
      if (error) throw error;
      const products = filterConsumerCatalogProducts(
        (data || []).map((row: any) => mapDirectRow(row as Record<string, unknown>))
      );
      return {
        products,
        total: opts.skipCount ? null : offset + products.length + (products.length >= limit ? 1 : 0),
        hasMore: products.length >= limit,
      };
    }

    let query = supabase
      .from(CATALOG_TABLE)
      .select("*", useExactCount ? { count: "exact" } : undefined)
      .eq("region", region)
      .not("image_url", "is", null)
      .not("price", "is", null);

    if (opts.isSale) query = query.eq("is_sale", true);

    if (opts.fiber && opts.fiber !== "all") {
      const f = opts.fiber.toLowerCase();
      if (f === "leather" || f === "leather_suede") {
        query = query.or("composition.ilike.%leather%,composition.ilike.%suede%");
      } else {
        query = query.ilike("composition", `%${f}%`);
      }
    }

    if (categories.length === 1) {
      query = applyCategoryFilter(query, categories[0]);
    } else if (categories.length > 1) {
      const allTypes = categories.flatMap((c) => CATEGORY_TO_GARMENT_TYPE[c.toLowerCase()] || []);
      if (allTypes.length) {
        query = query.in("garment_type", [...new Set(allTypes)]);
      }
    }

    if (opts.collection) {
      query = applyCollectionFilter(query, opts.collection);
    }

    if (opts.brand) {
      query = query.eq("brand_slug", opts.brand.toLowerCase());
    }

    if (searchText.length >= 2) {
      query = query.or(
        `name.ilike.%${searchText}%,brand_name.ilike.%${searchText}%,composition.ilike.%${searchText}%`
      );
    }

    if (opts.fiberSubtype) {
      query = query.ilike("composition", `%${opts.fiberSubtype}%`);
    }

    if (opts.color) {
      query = query.eq("color", opts.color);
    }

    query = applySort(query, opts.sort);
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    let rows = data || [];

    if (opts.maxPrice != null && opts.maxPrice > 0) {
      rows = rows.filter((row: any) => {
        const p = parseMoney(row.price);
        return p > 0 && p <= opts.maxPrice!;
      });
    }
    if (opts.minPrice != null && opts.minPrice > 0) {
      rows = rows.filter((row: any) => parseMoney(row.price) >= opts.minPrice!);
    }

    const products = filterConsumerCatalogProducts(
      rows.map((row: any) => mapDirectRow(row as Record<string, unknown>))
    );
    const total = opts.skipCount ? null : offset + products.length + (products.length >= limit ? 1 : 0);
    const hasMore = products.length >= limit;

    return { products, total, hasMore };
  } catch (err) {
    console.error("[queryLiveCatalog]", err);
    return { products: [], total: null, hasMore: false, error: "failed" };
  }
}

function mapDirectRow(row: Record<string, unknown>): DirectCatalogProduct {
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
