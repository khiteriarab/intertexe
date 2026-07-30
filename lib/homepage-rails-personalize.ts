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

function isMytheresaProduct(product: Pick<Product, "url" | "imageUrl">): boolean {
  return [product.url, product.imageUrl].some((value) => {
    if (!value) return false;
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      return hostname === "mytheresa.com" || hostname.endsWith(".mytheresa.com");
    } catch {
      return String(value).toLowerCase().includes("mytheresa.");
    }
  });
}

/** Put up to four saved Mytheresa pieces in premium Just Landed slots. */
function prioritizeJustLandedFavorites(products: Product[]): Product[] {
  const mytheresa = products.filter(isMytheresaProduct);
  const other = products.filter((product) => !isMytheresaProduct(product));
  return [
    ...mytheresa.slice(0, 4),
    ...other,
    ...mytheresa.slice(4),
  ];
}

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
    "id, product_id, brand_slug, brand_name, name, url, image_url, price, original_price, composition, natural_fiber_percent, category, color, matching_set_id, is_sale, region, collection_slugs, stock_status, canonical_id, is_displayable, is_active, is_editor_pick, editor_picked_at";

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

  // Prefer the footwear live catalog. `fabrics:leather-suede` is leather apparel
  // (skirts/jackets), so using it first produced an empty Natural Shoes rail and
  // forced a slow products-table fallback that timed out on iOS.
  const seen = new Set<string>();
  const out: Product[] = [];

  const ingest = (rows: any[] | null | undefined) => {
    for (const row of rows || []) {
      const product = mapProductRow(row);
      if (!isFootwearProduct(product)) continue;
      if (!product.imageUrl?.trim() || !product.price?.trim()) continue;
      const key = canonicalProductId(product) || product.productId || product.id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(product);
      if (out.length >= limit) return true;
    }
    return false;
  };

  for (const region of ["us", "eu"] as const) {
    if (out.length >= limit) break;
    const { data: rpcRows } = await supabase.rpc("footwear_catalog_page", {
      p_region: region,
      p_limit: Math.min(Math.max(limit * 2, 24), 48),
      p_offset: 0,
    });
    const rows = Array.isArray(rpcRows) ? rpcRows : rpcRows?.products;
    if (ingest(rows)) break;

    if (out.length >= limit) break;
    const { data: liveRows } = await supabase
      .from("live_products_footwear")
      .select(
        "id, product_id, brand_slug, brand_name, name, url, image_url, price, original_price, composition, natural_fiber_percent, category, color, matching_set_id, is_sale, region, collection_slugs, stock_status, canonical_id"
      )
      .eq("region", region)
      .eq("is_displayable", true)
      .not("image_url", "is", null)
      .not("price", "is", null)
      .limit(Math.min(Math.max(limit * 2, 24), 48));
    if (ingest(liveRows)) break;
  }

  if (out.length >= Math.min(limit, 4)) {
    return out.slice(0, limit);
  }

  // Last resort: displayable products query (slower, but better than empty rail).
  const { data } = await supabase
    .from("products")
    .select(
      "id, product_id, brand_slug, brand_name, name, url, image_url, price, original_price, composition, natural_fiber_percent, category, color, matching_set_id, is_sale, region, collection_slugs, stock_status, canonical_id, is_editor_pick, editor_picked_at"
    )
    .eq("is_displayable", true)
    .eq("region", "us")
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .or(
      "garment_type.eq.shoes,category.ilike.%Footwear%,category.ilike.%shoe%,name.ilike.%sandal%,name.ilike.%pump%,name.ilike.%mule%,name.ilike.%loafer%,name.ilike.%boot%,name.ilike.%sneaker%,name.ilike.%heel%"
    )
    .order("is_editor_pick", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit * 2, 24), 64));

  ingest(data);
  return out.slice(0, limit);
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

async function fetchEditorPickProducts(limit: number): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, product_id, brand_slug, brand_name, name, url, image_url, price, original_price, composition, natural_fiber_percent, category, color, matching_set_id, is_sale, region, collection_slugs, stock_status, canonical_id, is_editor_pick, editor_picked_at"
    )
    .eq("is_displayable", true)
    .eq("is_editor_pick", true)
    .eq("region", "us")
    .not("image_url", "is", null)
    .not("price", "is", null)
    .order("editor_picked_at", { ascending: false })
    .limit(Math.min(Math.max(limit * 3, 36), 72));

  if (error || !data?.length) return [];

  const seen = new Set<string>();
  const out: Product[] = [];
  for (const row of data) {
    const product = mapProductRow(row);
    const key = canonicalProductId(product) || product.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(product);
    if (out.length >= limit * 2) break;
  }
  return out;
}

export async function buildPersonalizedHomepageRails(opts?: {
  userId?: string | null;
  limit?: number;
}): Promise<HomepageRailsPayload> {
  const limit = Math.min(Math.max(opts?.limit ?? 12, 4), 24);
  const userId = opts?.userId ? String(opts.userId) : null;

  const [newInBase, shoesBase, editorPicks] = await Promise.all([
    fetchMerchRailProducts(MERCH_RAIL_KEYS.newIn, { limit: Math.min(limit * 2, 28) }),
    fetchNaturalShoesBaseRail(limit),
    fetchEditorPickProducts(limit),
  ]);

  const clothingRail = newInBase.filter((p) => !isFootwearProduct(p));
  const clothingEditorPicks = prioritizeJustLandedFavorites(
    editorPicks.filter((p) => !isFootwearProduct(p))
  );
  const shoeEditorPicks = editorPicks.filter((p) => isFootwearProduct(p));
  const editorPickIds = new Set(editorPicks.flatMap((p) => productKeys(p)));

  if (!userId) {
    return {
      version: 1,
      personalized: clothingEditorPicks.length > 0 || shoeEditorPicks.length > 0,
      sectionOrder: [...HOMEPAGE_SECTION_ORDER],
      rails: {
        // Curator favorites (is_editor_pick) lead New In for every shopper.
        new_in: mergeLeadingFavorites(
          clothingEditorPicks,
          clothingRail,
          limit,
          editorPickIds
        ),
        natural_shoes: mergeLeadingFavorites(
          shoeEditorPicks,
          shoesBase,
          limit,
          editorPickIds
        ),
      },
      favoritePolicy: {
        neverAutoDelete: true,
        soldOutRemainsFavorited: true,
        unavailableProductIds: [],
      },
    };
  }

  const favoriteIdsList = await loadFavoriteIds(userId);
  const favoriteIds = new Set([...favoriteIdsList, ...editorPickIds]);
  const { products: favoriteProducts, unavailableProductIds } =
    await resolveFavoriteProducts(favoriteIdsList);

  const clothingFavorites = favoriteProducts.filter((p) => !isFootwearProduct(p));
  const shoeFavorites = favoriteProducts.filter((p) => isFootwearProduct(p));
  const favoritedInNewIn = clothingRail.filter((p) => isSaved(p, favoriteIds));
  const isEditorPickKey = (product: Product) =>
    productKeys(product).some((key) => editorPickIds.has(key));
  // Editor's Picks always lead — never demote them behind the shopper's hearts.
  // Mytheresa premium slots apply only among non-curator favorites.
  const clothingFavoriteLeaders = prioritizeJustLandedFavorites(
    favoritedInNewIn
      .concat(clothingFavorites)
      .filter((product) => !isEditorPickKey(product))
  );

  return {
    version: 1,
    personalized: favoriteIdsList.length > 0 || editorPickIds.size > 0,
    sectionOrder: [...HOMEPAGE_SECTION_ORDER],
    rails: {
      new_in: mergeLeadingFavorites(
        clothingEditorPicks.concat(clothingFavoriteLeaders),
        clothingRail,
        limit,
        favoriteIds
      ),
      natural_shoes: mergeLeadingFavorites(
        shoeEditorPicks.concat(shoeFavorites),
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
