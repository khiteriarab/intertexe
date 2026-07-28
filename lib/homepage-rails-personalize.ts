/**
 * Backend-owned homepage rail personalization.
 * iOS should render the ordered response rather than re-ranking favorites locally.
 *
 * Favorites rules:
 * - Server is source of truth for product_favorites rows
 * - Never hard-delete a favorite because catalog/availability is temporarily missing
 * - Sold-out can be flagged for UI; heart stays until the user removes it
 */
import { canonicalProductId } from "./canonical-product-id";
import { HOMEPAGE_SECTION_ORDER } from "./homepage-merchandising-manifest";
import { MERCH_RAIL_KEYS, fetchMerchRailProducts } from "./merch-feed";
import { getServerSupabase, mapProductRow, type Product } from "./supabase-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FOOTWEAR_TERMS = [
  "shoe",
  "shoes",
  "footwear",
  "sandal",
  "sandals",
  "boot",
  "boots",
  "bootie",
  "booties",
  "sneaker",
  "sneakers",
  "heel",
  "heels",
  "pump",
  "pumps",
  "loafer",
  "loafers",
  "mule",
  "mules",
  "wedge",
  "wedges",
  "espadrille",
  "espadrilles",
  "slipper",
  "slippers",
  "trainer",
  "trainers",
  "slide",
  "slides",
  "flip flop",
  "flip-flop",
];

const ACCESSORY_EXCLUSIONS = [
  "belt",
  "wallet",
  "purse",
  "clutch",
  "handbag",
  "shoulder bag",
  "crossbody",
  "tote",
  "backpack",
  "keychain",
  "key ring",
  "card holder",
  "cardholder",
  "phone case",
  "necklace",
  "earring",
  "bracelet",
  "watch strap",
  "glove",
  "scarf",
];

export type HomepageRailsPayload = {
  version: 1;
  personalized: boolean;
  sectionOrder: string[];
  rails: {
    new_in: Product[];
    natural_shoes: Product[];
  };
  favoritePolicy: {
    neverAutoDelete: true;
    soldOutRemainsFavorited: true;
    unavailableProductIds: string[];
  };
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function isFootwearProduct(product: {
  category?: string | null;
  name?: string | null;
}): boolean {
  const text = `${product.category || ""} ${product.name || ""}`.toLowerCase();
  if (ACCESSORY_EXCLUSIONS.some((term) => text.includes(term))) return false;
  return FOOTWEAR_TERMS.some((term) => text.includes(term));
}

function productKeys(product: Product): string[] {
  return [
    canonicalProductId(product),
    String(product.productId || ""),
    String(product.id || ""),
  ].filter(Boolean);
}

function isSaved(product: Product, favoriteIds: Set<string>): boolean {
  return productKeys(product).some((key) => favoriteIds.has(key));
}

export function mergeLeadingFavorites(
  favorites: Product[],
  rail: Product[],
  limit: number,
  favoriteIds: Set<string>
): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];

  const append = (product: Product) => {
    const keys = productKeys(product);
    if (!keys.length || keys.some((k) => seen.has(k))) return;
    for (const k of keys) seen.add(k);
    out.push(product);
  };

  for (const product of favorites) {
    if (!isSaved(product, favoriteIds)) continue;
    append(product);
    if (out.length >= limit) return out;
  }
  for (const product of rail) {
    append(product);
    if (out.length >= limit) return out;
  }
  return out;
}

async function resolveFavoriteProducts(
  favoriteIds: string[]
): Promise<{ products: Product[]; unavailableProductIds: string[] }> {
  const supabase = getServerSupabase();
  if (!supabase || favoriteIds.length === 0) {
    return { products: [], unavailableProductIds: [] };
  }

  const uuidIds = favoriteIds.filter((id) => UUID_RE.test(id));
  const externalIds = favoriteIds.filter((id) => !UUID_RE.test(id));
  const byKey = new Map<string, Product>();
  const cols =
    "id, product_id, brand_slug, brand_name, name, title, url, image_url, price, original_price, composition, natural_fiber_percent, category, color, matching_set_id, is_sale, region, collection_slugs, stock_status, canonical_id, is_displayable, is_active";

  for (const batch of chunk(uuidIds, 100)) {
    const { data } = await supabase.from("products").select(cols).in("id", batch);
    for (const row of data || []) {
      const product = mapProductRow(row);
      for (const key of productKeys(product)) byKey.set(key, product);
    }
  }

  for (const batch of chunk(externalIds, 100)) {
    const { data } = await supabase.from("products").select(cols).in("product_id", batch);
    for (const row of data || []) {
      const product = mapProductRow(row);
      for (const key of productKeys(product)) byKey.set(key, product);
    }
  }

  const products: Product[] = [];
  const seen = new Set<string>();
  const unavailableProductIds: string[] = [];

  for (const id of favoriteIds) {
    const product = byKey.get(id);
    if (!product) {
      // Missing catalog row ≠ delete favorite. Surface for optional UI only.
      unavailableProductIds.push(id);
      continue;
    }
    const key = canonicalProductId(product) || product.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    products.push(product);

    const status = (product.stockStatus || "").toLowerCase();
    if (
      /sold[\s_-]?out/.test(status) ||
      /out[\s_-]?of[\s_-]?stock/.test(status) ||
      status === "unavailable" ||
      status === "discontinued"
    ) {
      unavailableProductIds.push(id);
    }
  }

  return { products, unavailableProductIds };
}

async function fetchNaturalShoesBaseRail(limit: number): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const leather = await fetchMerchRailProducts(MERCH_RAIL_KEYS.leatherSuede, {
    limit: Math.min(limit * 3, 48),
  });
  const fromLeather = leather.filter(isFootwearProduct);
  if (fromLeather.length >= Math.min(limit, 6)) {
    return fromLeather.slice(0, limit);
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, product_id, brand_slug, brand_name, name, title, url, image_url, price, original_price, composition, natural_fiber_percent, category, color, matching_set_id, is_sale, region, collection_slugs, stock_status, canonical_id"
    )
    .eq("is_displayable", true)
    .eq("region", "us")
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .or(
      "garment_type.eq.shoes,category.ilike.%Footwear%,category.ilike.%shoe%,name.ilike.%sandal%,name.ilike.%pump%,name.ilike.%mule%,name.ilike.%loafer%,name.ilike.%boot%,name.ilike.%sneaker%,name.ilike.%heel%"
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit * 2, 24), 64));

  if (error || !data?.length) return fromLeather.slice(0, limit);

  const seen = new Set<string>();
  const out: Product[] = [];
  for (const row of data) {
    const product = mapProductRow(row);
    if (!isFootwearProduct(product)) continue;
    const key = canonicalProductId(product) || product.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(product);
    if (out.length >= limit) break;
  }
  return out.length > 0 ? out : fromLeather.slice(0, limit);
}

async function loadFavoriteIds(userId: string): Promise<string[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("product_favorites")
    .select("product_id")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data
    .map((row: { product_id: string }) => String(row.product_id || "").trim())
    .filter(Boolean);
}

export async function buildPersonalizedHomepageRails(opts?: {
  userId?: string | null;
  limit?: number;
}): Promise<HomepageRailsPayload> {
  const limit = Math.min(Math.max(opts?.limit ?? 12, 4), 24);
  const userId = opts?.userId ? String(opts.userId) : null;

  const [newInBase, shoesBase] = await Promise.all([
    fetchMerchRailProducts(MERCH_RAIL_KEYS.newIn, { limit: Math.min(limit * 2, 28) }),
    fetchNaturalShoesBaseRail(limit),
  ]);

  const clothingRail = newInBase.filter((p) => !isFootwearProduct(p));

  if (!userId) {
    return {
      version: 1,
      personalized: false,
      sectionOrder: [...HOMEPAGE_SECTION_ORDER],
      rails: {
        new_in: clothingRail.slice(0, limit),
        natural_shoes: shoesBase.slice(0, limit),
      },
      favoritePolicy: {
        neverAutoDelete: true,
        soldOutRemainsFavorited: true,
        unavailableProductIds: [],
      },
    };
  }

  const favoriteIdsList = await loadFavoriteIds(userId);
  const favoriteIds = new Set(favoriteIdsList);
  const { products: favoriteProducts, unavailableProductIds } =
    await resolveFavoriteProducts(favoriteIdsList);

  const clothingFavorites = favoriteProducts.filter((p) => !isFootwearProduct(p));
  const shoeFavorites = favoriteProducts.filter((p) => isFootwearProduct(p));
  const favoritedInNewIn = clothingRail.filter((p) => isSaved(p, favoriteIds));

  return {
    version: 1,
    personalized: favoriteIds.size > 0,
    sectionOrder: [...HOMEPAGE_SECTION_ORDER],
    rails: {
      new_in: mergeLeadingFavorites(
        favoritedInNewIn.concat(clothingFavorites),
        clothingRail,
        limit,
        favoriteIds
      ),
      natural_shoes: mergeLeadingFavorites(
        shoeFavorites,
        shoesBase,
        limit,
        favoriteIds
      ),
    },
    favoritePolicy: {
      neverAutoDelete: true,
      soldOutRemainsFavorited: true,
      unavailableProductIds,
    },
  };
}
