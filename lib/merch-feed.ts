/**
 * Shared merchandising read layer (web + iOS contract).
 * Source: homepage_merch_rails registry + homepage_feed_items cache + homepage_feed_meta counts.
 */
import { getServerSupabase, catalogRegionsFromMarket, type Product } from "./supabase-server";
import { liveProductsApparelFrom } from "./global-catalog-scope";
import { sanitizeBrandName } from "./brand-display";
import { catalogDedupeKey } from "./catalog-rules";
import { displayNaturalFiberPercent } from "./display-natural-fiber";
import { logSupabaseTiming } from "./supabase-timing";

export const MERCH_RAIL_KEYS = {
  newIn: "top:new_in",
  silk: "fabrics:silk",
  linen: "fabrics:linen",
  cashmere: "fabrics:cashmere",
  wool: "fabrics:wool",
  cotton: "fabrics:cotton",
  leatherSuede: "fabrics:leather-suede",
  vacation: "collections:vacation",
  evening: "collections:evening",
  tailoring: "collections:tailoring",
  summerInCity: "collections:summer-in-the-city",
  whiteEdit: "collections:white-edit",
  designersCurated: "designers:curated",
  sale: "sale:all",
} as const;

export type MerchRailKey = (typeof MERCH_RAIL_KEYS)[keyof typeof MERCH_RAIL_KEYS];

/** Material hub slug → shared rail_key */
export const MATERIAL_SLUG_TO_RAIL: Record<string, MerchRailKey> = {
  silk: MERCH_RAIL_KEYS.silk,
  linen: MERCH_RAIL_KEYS.linen,
  cashmere: MERCH_RAIL_KEYS.cashmere,
  wool: MERCH_RAIL_KEYS.wool,
  cotton: MERCH_RAIL_KEYS.cotton,
  leather: MERCH_RAIL_KEYS.leatherSuede,
  "leather-suede": MERCH_RAIL_KEYS.leatherSuede,
};

const FEED_SELECT_COLS =
  "rank, source_id, product_id, brand_slug, brand_name, name, url, image_url, price, natural_fiber_percent, category, is_sale";

export function isMerchFeedEnabled(): boolean {
  return process.env.HOMEPAGE_USE_FEED_CACHE !== "0";
}

/** Client guard when RPC unavailable — strip trim/embroidery tail before fiber match. */
function compositionMatchesBodyFiber(composition: string, fiber: string): boolean {
  const body = composition.split(/\b(trim|embroidery\s+fabric|embroidery|lining|contrast|pocket|rib)\s*:/i)[0] ?? "";
  const b = body.toLowerCase();
  switch (fiber) {
    case "silk":
      return /(silk|mulberry)/.test(b);
    case "linen":
      return /(linen|flax)/.test(b);
    case "cashmere":
      return /cashmere/.test(b);
    case "wool":
      return /(wool|merino|lambswool)/.test(b);
    case "cotton":
      return /cotton/.test(b);
    case "leather_suede":
      return /(leather|suede)/.test(b);
    default:
      return false;
  }
}

function mapFeedRowToProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.source_id ?? ""),
    productId: String(row.product_id ?? ""),
    brandSlug: String(row.brand_slug ?? ""),
    brandName: sanitizeBrandName(String(row.brand_name ?? "")),
    name: String(row.name ?? ""),
    url: String(row.url ?? ""),
    imageUrl: String(row.image_url ?? ""),
    price: String(row.price ?? ""),
    composition: "",
    naturalFiberPercent: displayNaturalFiberPercent(
      Number(row.natural_fiber_percent ?? 0)
    ),
    category: row.category != null ? String(row.category) : "",
    isSale: row.is_sale === true,
  };
}

export type MerchFeedMetaRow = {
  rail_key: string;
  row_count: number | null;
  source_rows: number | null;
  display_count: number | null;
  refresh_ms: number | null;
  refreshed_at: string | null;
  last_error: string | null;
};

export async function fetchMerchFeedMeta(railKey?: string): Promise<MerchFeedMetaRow[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  let q = supabase
    .from("homepage_feed_meta")
    .select("rail_key, row_count, source_rows, refresh_ms, refreshed_at, last_error")
    .order("rail_key");
  if (railKey) q = q.eq("rail_key", railKey);

  const { data, error } = await q;
  if (error) {
    console.warn("[merch-feed] meta error:", error.message);
    return [];
  }
  return (data || []) as MerchFeedMetaRow[];
}

/** Homepage rail preview count only — do not use for shop/sale/collection full-page totals. */
export async function fetchMerchRailDisplayCount(railKey: MerchRailKey): Promise<number> {
  const rows = await fetchMerchFeedMeta(railKey);
  const row = rows[0];
  const metaCount = row?.source_rows ?? row?.row_count ?? 0;
  if (metaCount > 0) return Number(metaCount);

  const supabase = getServerSupabase();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("homepage_feed_items")
    .select("rail_key", { count: "exact", head: true })
    .eq("rail_key", railKey);
  return count ?? 0;
}

export async function fetchMerchGlobalDisplayCount(): Promise<number> {
  const rows = await fetchMerchFeedMeta("global");
  const row = rows[0];
  if (row) {
    const n = row.source_rows ?? row.row_count ?? 0;
    if (n > 5000) return Number(n);
  }
  const { fetchPlatformStats } = await import("./platform-stats");
  const stats = await fetchPlatformStats();
  return stats.productCount;
}

/** Canonical shared product read for homepage, materials, collections. */
export async function fetchMerchRailProducts(
  railKey: MerchRailKey,
  opts?: { limit?: number; offset?: number; market?: string }
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const limit = Math.min(Math.max(opts?.limit ?? 48, 1), 120);
  const offset = Math.max(opts?.offset ?? 0, 0);
  const t0 = Date.now();

  const { data, error } = await supabase
    .from("homepage_feed_items")
    .select(FEED_SELECT_COLS)
    .eq("rail_key", railKey)
    .order("rank", { ascending: true })
    .range(offset, offset + limit - 1);

  logSupabaseTiming(
    `merch-feed rail=${railKey}`,
    t0,
    error ? `error:${error.message}` : `rows:${(data || []).length}`
  );

  if (error) {
    console.warn(`[merch-feed] rail=${railKey} error:`, error.message);
    return [];
  }

  const seen = new Set<string>();
  const products: Product[] = [];
  for (const row of (data || []) as Record<string, unknown>[]) {
    const key = catalogDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    products.push(mapFeedRowToProduct(row));
    if (products.length >= limit) break;
  }
  if (products.length > 0) return products;

  return fetchMerchRailLiveFallback(railKey, limit, opts?.market);
}

/** One round-trip for all homepage rails (avoids 6+ sequential feed queries). */
export async function fetchMerchRailsBatch(
  railKeys: MerchRailKey[],
  limitPerRail = 24
): Promise<Record<string, Product[]>> {
  const supabase = getServerSupabase();
  const out: Record<string, Product[]> = {};
  for (const k of railKeys) out[k] = [];
  if (!supabase || railKeys.length === 0) return out;

  const cap = Math.min(Math.max(limitPerRail, 1), 32);
  const t0 = Date.now();
  const { data, error } = await supabase
    .from("homepage_feed_items")
    .select(`${FEED_SELECT_COLS}, rail_key`)
    .in("rail_key", railKeys)
    .lte("rank", cap)
    .order("rail_key", { ascending: true })
    .order("rank", { ascending: true });

  logSupabaseTiming(
    `merch-feed batch keys=${railKeys.length}`,
    t0,
    error ? `error:${error.message}` : `rows:${(data || []).length}`
  );

  if (error || !data?.length) return out;

  const seenByRail: Record<string, Set<string>> = {};
  for (const row of data as Record<string, unknown>[]) {
    const rail = String(row.rail_key ?? "");
    if (!out[rail] || out[rail].length >= cap) continue;
    if (!seenByRail[rail]) seenByRail[rail] = new Set();
    const dedupeKey = catalogDedupeKey(row);
    if (seenByRail[rail].has(dedupeKey)) continue;
    seenByRail[rail].add(dedupeKey);
    out[rail].push(mapFeedRowToProduct(row));
  }
  return out;
}

/** Bounded live fallback — no catalog_list on hot path. */
async function fetchMerchRailLiveFallback(
  railKey: MerchRailKey,
  limit: number,
  market?: string
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { preferred } = catalogRegionsFromMarket(market);
  const fiber = railKey.startsWith("fabrics:") ? railKey.split(":")[1] : null;
  if (!fiber) return [];

  const t0 = Date.now();
  const fiberKey =
    fiber === "leather-suede" ? "leather_suede" : fiber;

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "catalog_offers_for_material_rail",
    { p_fiber: fiberKey, p_limit: Math.min(limit * 3, 180) }
  );

  if (!rpcError && rpcData?.length) {
    logSupabaseTiming(
      `merch-feed live-fallback ${railKey} (rpc)`,
      t0,
      `rows:${rpcData.length}`
    );
    const seen = new Set<string>();
    const out: Product[] = [];
    for (const row of rpcData as Record<string, unknown>[]) {
      const key = catalogDedupeKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      const price = String(row.price ?? "");
      if (!price || price === "0" || price === "$0.00") continue;
      out.push({
        id: String(row.id ?? ""),
        productId: key,
        brandSlug: String(row.brand_slug ?? ""),
        brandName: sanitizeBrandName(String(row.brand_name ?? "")),
        name: String(row.name ?? ""),
        url: String(row.url ?? ""),
        imageUrl: String(row.image_url ?? ""),
        price,
        composition: String(row.composition ?? ""),
        naturalFiberPercent: displayNaturalFiberPercent(
          Number(row.natural_fiber_percent ?? 0)
        ),
        category: row.category != null ? String(row.category) : "",
        isSale: row.is_sale === true,
        listingRegion: row.region != null ? String(row.region) : null,
      });
      if (out.length >= limit) break;
    }
    return out;
  }

  const patterns =
    fiber === "wool"
      ? ["%wool%", "%merino%", "%lambswool%"]
      : fiber === "cotton"
        ? ["%cotton%", "%organic cotton%"]
        : [`%${fiber}%`];

  let q = liveProductsApparelFrom(supabase)
    
    .select(
      "id, product_id, brand_slug, brand_name, name, url, image_url, price, composition, natural_fiber_percent, category, is_sale, region, material_metadata"
    )
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null);

  if (patterns.length === 1) {
    q = q.ilike("composition", patterns[0]);
  } else {
    q = q.or(patterns.map((p) => `composition.ilike.${p}`).join(","));
  }

  const { data, error } = await q
    .order("natural_fiber_percent", { ascending: false })
    .limit(Math.min(limit * 3, 180));

  logSupabaseTiming(`merch-feed live-fallback ${railKey}`, t0, error ? `error:${error.message}` : `rows:${(data || []).length}`);
  if (error || !data?.length) return [];

  const seen = new Set<string>();
  const out: Product[] = [];
  for (const row of data as Record<string, unknown>[]) {
    const comp = String(row.composition ?? "");
    if (comp && !compositionMatchesBodyFiber(comp, fiberKey)) continue;
    const key = catalogDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    const price = String(row.price ?? "");
    if (!price || price === "0" || price === "$0.00") continue;
    out.push({
      id: String(row.id ?? ""),
      productId: String(row.product_id || row.id),
      brandSlug: String(row.brand_slug ?? ""),
      brandName: sanitizeBrandName(String(row.brand_name ?? "")),
      name: String(row.name ?? ""),
      url: String(row.url ?? ""),
      imageUrl: String(row.image_url ?? ""),
      price,
      composition: String(row.composition ?? ""),
      naturalFiberPercent: displayNaturalFiberPercent(
        Number(row.natural_fiber_percent ?? 0)
      ),
      category: row.category != null ? String(row.category) : "",
      isSale: row.is_sale === true,
      listingRegion: row.region != null ? String(row.region) : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export type MerchRailRegistryRow = {
  rail_key: string;
  axis: string;
  slug: string;
  display_label: string;
  canonical_collection_slug: string | null;
  sort_order: number;
  enabled: boolean;
};

export async function fetchMerchRailRegistry(): Promise<MerchRailRegistryRow[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("homepage_merch_rails")
    .select("rail_key, axis, slug, display_label, canonical_collection_slug, sort_order, enabled")
    .eq("enabled", true)
    .order("sort_order");
  if (error) return [];
  return (data || []) as MerchRailRegistryRow[];
}
