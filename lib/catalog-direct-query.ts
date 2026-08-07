/**
 * Shop catalog browse.
 * Authoritative path: catalog_browse_page_v2 (same RPC + param mapping as iOS).
 * Legacy paths: collection / sale only (not covered by v2).
 */
import { getServerSupabase } from "./supabase-service-client";
import { filterConsumerCatalogProducts } from "./catalog-consumer-guard";
import { applyCategoryFilter, CATEGORY_TO_GARMENT_TYPE } from "./catalog-shop-mappings";
import { queryCatalogListRPC } from "./catalog-list-rpc";
import {
  queryCatalogBrowsePageV2,
  shouldUseAuthoritativeBrowse,
  type CatalogBrowseV2Result,
  type CatalogFilterCoverage,
} from "./catalog-browse-v2";
import { isFootwearListing } from "./catalog-product-filters";
import {
  filterProductsForIntegrity,
  integritySpecFromBrowseOpts,
  type FilterIntegritySpec,
} from "./catalog-filter-integrity";

function apparelOnlyProducts<T extends { category?: string | null; name?: string | null }>(
  products: T[]
): T[] {
  return products.filter((p) => !isFootwearListing(p));
}

const CATALOG_TABLE = "live_products_apparel";

export { CATEGORY_TO_GARMENT_TYPE, applyCategoryFilter };
export type { CatalogFilterCoverage };

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
  isEditorPick?: boolean;
  editorPickedAt?: string | null;
  materialSubtype?: string | null;
  fabricConstruction?: string | null;
  shopMaterialFamily?: string | null;
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
  /** Canonical material subtype slug or label (Phase 1). */
  materialSubtype?: string;
  /** Fabric construction slug or label (Phase 1). */
  fabricConstruction?: string;
  isSale?: boolean;
  skipCount?: boolean;
};

/** Shared post-query integrity gate for every catalog product list. */
function applyCatalogIntegrity<T extends DirectCatalogProduct>(
  products: T[],
  opts: CatalogDirectQueryOpts & { apparelOnly?: boolean }
): T[] {
  const categories = opts.categories?.length
    ? opts.categories
    : opts.category
      ? [opts.category]
      : [];
  const category =
    categories.find((c) => c && c !== "all" && c !== "apparel" && c !== "clothing") ||
    (opts.category === "clothing" ? "clothing" : undefined);
  const spec: FilterIntegritySpec = integritySpecFromBrowseOpts({
    category,
    fiber: opts.fiber,
    minPrice: opts.minPrice,
    maxPrice: opts.maxPrice,
    brand: opts.brand,
    color: opts.color,
    isSale: opts.isSale,
    materialSubtype: opts.materialSubtype || opts.fiberSubtype,
    fabricConstruction: opts.fabricConstruction,
    apparelOnly: opts.apparelOnly !== false,
  });
  return filterProductsForIntegrity(products, spec);
}

function parseMoney(price: unknown): number {
  const n = parseFloat(String(price ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function applySort(query: any, sort?: string) {
  switch (sort) {
    case "price-low":
      // Price sorts must be pure — editor picks must not jump expensive items ahead.
      return query.order("price", { ascending: true }).order("id", { ascending: false });
    case "price-high":
      return query.order("price", { ascending: false }).order("id", { ascending: false });
    case "natural-high":
      return query.order("id", { ascending: false });
    case "recommended":
    case "new":
    default:
      // Curator picks only boost the default / recommended rails.
      return query.order("is_editor_pick", { ascending: false }).order("id", { ascending: false });
  }
}

export type CatalogLiveQueryResult = {
  products: DirectCatalogProduct[];
  total: number | null;
  hasMore: boolean;
  error?: "failed" | "timeout";
  emptyReason?: string | null;
  /** Present when authoritative v2 path was used — for parity / debugging. */
  productIds?: string[];
  rpcVersion?: string;
  totalStatus?: string;
  filterCoverage?: CatalogFilterCoverage | null;
  rpcParams?: Record<string, unknown>;
};

export async function queryLiveCatalog(opts: CatalogDirectQueryOpts): Promise<CatalogLiveQueryResult> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: 0, hasMore: false, error: "failed" };

  const region = (opts.region || "us").toLowerCase();
  const limit = Math.min(Math.max(opts.limit ?? 48, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const searchText = (opts.q || opts.search || "").trim();
  const categories = opts.categories?.length
    ? opts.categories.filter((c) => c && c !== "all" && c !== "apparel" && c !== "clothing")
    : opts.category && opts.category !== "all" && opts.category !== "apparel" && opts.category !== "clothing"
      ? [opts.category]
      : [];

  // Same RPC as iOS for all shop browse except collection/sale specialty paths.
  if (shouldUseAuthoritativeBrowse(opts)) {
    const v2 = await queryCatalogBrowsePageV2({
      region,
      limit: Math.min(limit, 100),
      offset,
      fiber: opts.fiber,
      category: categories[0] || (opts.category === "clothing" ? "clothing" : undefined),
      brand: opts.brand,
      search: searchText || undefined,
      sort: opts.sort,
      minPrice: opts.minPrice,
      maxPrice: opts.maxPrice,
      color: opts.color,
      materialSubtype: opts.materialSubtype || opts.fiberSubtype,
      fabricConstruction: opts.fabricConstruction,
      apparelOnly: true,
    });
    if (!v2.error) {
      return mapV2Result(v2);
    }
    // Filtered browse must not fall back to legacy (would diverge from iOS IDs).
    // Timeouts / RPC failures must surface as errors — never as empty catalogs.
    const hasFilters = Boolean(
      opts.fiber ||
        opts.fiberSubtype ||
        opts.materialSubtype ||
        opts.fabricConstruction ||
        categories.length ||
        opts.brand ||
        searchText.length >= 2 ||
        opts.color ||
        opts.maxPrice ||
        opts.minPrice
    );
    if (hasFilters) {
      console.error(
        "[queryLiveCatalog] authoritative v2 failed; refusing legacy fallback for filtered browse",
        v2.error,
        v2.emptyReason
      );
      return {
        products: [],
        total: null,
        hasMore: false,
        error: v2.error === "timeout" ? "timeout" : "failed",
        emptyReason: v2.emptyReason,
        rpcVersion: "catalog_browse_page_v2",
        rpcParams: v2.rpcParams,
      };
    }
    console.warn("[queryLiveCatalog] v2 failed on unfiltered browse; using legacy fast path");
  }

  const hasNarrowingFilter = Boolean(
    opts.fiber ||
    opts.fiberSubtype ||
    opts.materialSubtype ||
    opts.fabricConstruction ||
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
    !opts.fiberSubtype &&
    !opts.materialSubtype &&
    !opts.fabricConstruction &&
    opts.maxPrice == null &&
    opts.minPrice == null;

  try {
    // Fast path — is_displayable + id sort (~500ms). Legacy RPC/NFP sort hits statement_timeout.
    if (!hasNarrowingFilter && !opts.isSale) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_displayable", true)
        .eq("region", region)
        .order("is_editor_pick", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);
      if (!error && data?.length) {
        const products = applyCatalogIntegrity(
          apparelOnlyProducts(
            filterConsumerCatalogProducts(
              data.map((row) => mapDirectRow(row as Record<string, unknown>))
            )
          ),
          opts
        );
        return {
          products,
          total: offset + products.length + (products.length >= limit ? 1 : 0),
          hasMore: products.length >= limit,
        };
      }
    }

    // Consumer catalog — use indexed catalog_list RPC (same as iOS; direct view scan times out).
    if (canUseCatalogListRPC && (!hasNarrowingFilter || opts.fiber || categories.length === 1 || opts.brand || searchText.length >= 2)) {
      const rpc = await queryCatalogListRPC(opts);
      if (!rpc.error && rpc.products.length > 0) {
        const products = applyCatalogIntegrity(
          apparelOnlyProducts(rpc.products as DirectCatalogProduct[]),
          opts
        );
        return {
          ...rpc,
          products,
          total:
            products.length === 0
              ? 0
              : rpc.total,
          hasMore: products.length === 0 ? false : rpc.hasMore,
        };
      }
      if (!hasNarrowingFilter && !rpc.error) {
        const products = applyCatalogIntegrity(
          apparelOnlyProducts((rpc.products || []) as DirectCatalogProduct[]),
          opts
        );
        return {
          ...rpc,
          products,
          total: products.length === 0 && (rpc.products?.length ?? 0) > 0 ? 0 : rpc.total,
          hasMore: products.length === 0 ? false : rpc.hasMore,
        };
      }
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
      const products = applyCatalogIntegrity(
        apparelOnlyProducts(
          filterConsumerCatalogProducts(
            (data || []).map((row: any) => mapDirectRow(row as Record<string, unknown>))
          )
        ),
        opts
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
      const products = applyCatalogIntegrity(
        apparelOnlyProducts(
          filterConsumerCatalogProducts(
            (data || []).map((row: any) => mapDirectRow(row as Record<string, unknown>))
          )
        ),
        opts
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

    const materialSubtype = opts.materialSubtype || opts.fiberSubtype;
    if (materialSubtype) {
      // Normalized column first; composition ILIKE fallback (slug + spaced form).
      const spaced = materialSubtype.replace(/_/g, " ");
      const parts = [
        `material_subtype.eq.${materialSubtype}`,
        `material_subtype_label.ilike.%${materialSubtype}%`,
        `composition.ilike.%${materialSubtype}%`,
      ];
      if (spaced !== materialSubtype) {
        parts.push(`material_subtype_label.ilike.%${spaced}%`);
        parts.push(`composition.ilike.%${spaced}%`);
      }
      query = query.or(parts.join(","));
    }

    if (opts.fabricConstruction) {
      const c = opts.fabricConstruction;
      const spaced = c.replace(/_/g, " ");
      const parts = [`fabric_construction.eq.${c}`, `composition.ilike.%${c}%`];
      if (spaced !== c) parts.push(`composition.ilike.%${spaced}%`);
      query = query.or(parts.join(","));
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

    const products = applyCatalogIntegrity(
      apparelOnlyProducts(
        filterConsumerCatalogProducts(
          rows.map((row: any) => mapDirectRow(row as Record<string, unknown>))
        )
      ),
      opts
    );
    const total = opts.skipCount
      ? null
      : products.length === 0 && rows.length > 0
        ? 0
        : offset + products.length + (products.length >= limit ? 1 : 0);
    const hasMore = products.length >= limit && products.length > 0;

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
    isEditorPick: row.is_editor_pick === true,
    editorPickedAt: row.editor_picked_at != null ? String(row.editor_picked_at) : null,
    materialSubtype: row.material_subtype != null ? String(row.material_subtype) : null,
    fabricConstruction: row.fabric_construction != null ? String(row.fabric_construction) : null,
    shopMaterialFamily: row.shop_material_family != null ? String(row.shop_material_family) : null,
  };
}

function mapV2Result(v2: CatalogBrowseV2Result): CatalogLiveQueryResult {
  // Shop clothing PLP — shoes live on /shop/shoes only. Integrity already applied in v2.
  const products = apparelOnlyProducts(v2.products as DirectCatalogProduct[]);
  return {
    products,
    total: products.length === 0 && v2.products.length > 0 ? 0 : v2.total,
    hasMore: products.length === 0 ? false : v2.hasMore,
    productIds: products.map((p) => p.id).filter(Boolean),
    rpcVersion: v2.rpcVersion,
    totalStatus: v2.totalStatus,
    filterCoverage: v2.filterCoverage,
    rpcParams: v2.rpcParams,
    emptyReason:
      products.length === 0 && v2.products.length > 0
        ? "filter_integrity_empty"
        : v2.emptyReason,
    error: v2.error,
  };
}
