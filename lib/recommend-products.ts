/**
 * Server-owned product recommendations for scanner + PDP rails.
 * Ranking can change without an App Store rebuild — iOS calls /api/recommend/products.
 */
import { mapProductRow, type Product } from "./supabase-server";
import { getServerSupabase } from "./supabase-service-client";
import { queryCatalogBrowsePageV2 } from "./catalog-browse-v2";

export type RecommendProductsInput = {
  fiber?: string | null;
  priceUSD?: number | null;
  currency?: string | null;
  garmentType?: string | null;
  naturalPercent?: number | null;
  region?: string | null;
  limit?: number | null;
  savedProductIds?: string[] | null;
  preferredMaterials?: string[] | null;
  personaMaterials?: string[] | null;
  excludeProductId?: string | null;
  composition?: string | null;
};

export type RecommendProductsResult = {
  version: 1;
  source: "server";
  products: Product[];
};

const EXCLUDED_PHRASES = [
  "napkin",
  "table linen",
  "tablecloth",
  "placemat",
  "tea towel",
  "dish towel",
  "bath towel",
  "hand towel",
  "bedding",
  "bed linen",
  "duvet",
  "pillow",
  "blanket",
  "throw blanket",
  "curtain",
  "rug",
  "bath mat",
  "homeware",
  "home ware",
  "kitchen",
  "upholstery",
  "christmas stocking",
  "boho stocking",
  "ornament",
  "hosiery",
];

const GARMENT_TO_CATEGORY: Record<string, string> = {
  dress: "dresses",
  dresses: "dresses",
  skirt: "skirts",
  skirts: "skirts",
  trouser: "trousers",
  trousers: "trousers",
  pant: "trousers",
  pants: "trousers",
  jean: "jeans",
  jeans: "jeans",
  top: "tops",
  tops: "tops",
  blouse: "tops",
  shirt: "tops",
  knit: "knitwear",
  knitwear: "knitwear",
  sweater: "knitwear",
  coat: "coats",
  coats: "coats",
  jacket: "jackets",
  jackets: "jackets",
  blazer: "jackets",
  short: "shorts",
  shorts: "shorts",
  jumpsuit: "jumpsuits",
  jumpsuits: "jumpsuits",
};

function looksLikeFootwear(product: Product): boolean {
  const text = `${product.category || ""} ${product.name || ""}`.toLowerCase();
  return /\b(shoe|shoes|footwear|sandal|sandals|boot|boots|sneaker|sneakers|heel|heels|pump|pumps|loafer|loafers|mule|mules)\b/.test(
    text
  );
}

function parsePrice(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const n = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  return 0;
}

function productKeys(product: Product): string[] {
  return [String(product.productId || ""), String(product.id || "")].filter(Boolean);
}

export function isEligibleRecommendation(product: Product): boolean {
  const category = String(product.category || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();
  const brand = String(product.brandName || "").toLowerCase();
  const text = `${category} ${name} ${brand}`;

  if (category.includes("home") || category.includes("garden") || category.includes("decor")) {
    return false;
  }
  if (EXCLUDED_PHRASES.some((phrase) => text.includes(phrase))) {
    return false;
  }

  const looksLikeFootwearItem = /\b(sneaker|sneakers|shoe|shoes|boot|boots|sandal|sandals|loafer|loafers)\b/.test(
    text
  );
  if (!looksLikeFootwearItem && /\b(socks?|stockings?|tights|pantyhose|anklets?)\b/.test(text)) {
    return false;
  }

  const composition = String(product.composition || "").trim();
  if (!composition) return false;
  if (!product.imageUrl?.trim()) return false;
  if (!product.price?.trim()) return false;
  return true;
}

function classifyPriceTier(
  price: number,
  anchor: number
): "near" | "stretch" | null {
  if (!(anchor > 0) || !(price > 0)) return null;
  const nearMin = anchor * 0.7;
  const nearMax = anchor * 1.15;
  const stretchMax = anchor * 1.35;
  if (price >= nearMin && price <= nearMax) return "near";
  if (price > nearMax && price <= stretchMax) return "stretch";
  return null;
}

function scoreProduct(
  product: Product,
  opts: {
    detectedFiber: string;
    preferredMaterials: Set<string>;
    personaMaterials: Set<string>;
    savedIds: Set<string>;
    savedBrands: Set<string>;
    anchor: number;
  }
): number {
  let value = 0;
  const haystack = `${product.composition || ""} ${product.name || ""} ${product.category || ""} ${product.brandName || ""}`.toLowerCase();
  const keys = productKeys(product);
  const brand = String(product.brandName || "").toLowerCase();
  const price = parsePrice(product.price);

  if (keys.some((key) => opts.savedIds.has(key))) value += 200;
  if (product.isEditorPick) value += 100;
  if (brand && opts.savedBrands.has(brand)) value += 40;

  const tier = classifyPriceTier(price, opts.anchor);
  if (tier === "near") value += 35;
  else if (tier === "stretch") value += 22;
  else if (opts.anchor > 0 && price > 0) {
    const distance = Math.abs(price - opts.anchor) / opts.anchor;
    if (distance <= 0.5) value += 8;
  }

  const fiber = opts.detectedFiber.toLowerCase();
  if (fiber && haystack.includes(fiber)) value += 4;
  for (const material of opts.personaMaterials) {
    if (material && haystack.includes(material)) {
      value += 5;
      break;
    }
  }
  for (const material of opts.preferredMaterials) {
    if (material && haystack.includes(material)) {
      value += 8;
      break;
    }
  }
  value += Math.min(Math.floor((product.naturalFiberPercent || 0) / 25), 4);
  return value;
}

async function resolveFavoriteProducts(ids: string[]): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase || ids.length === 0) return [];

  const uuidIds = ids.filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  );
  const externalIds = ids.filter((id) => !uuidIds.includes(id));
  const cols =
    "id, product_id, brand_slug, brand_name, name, url, image_url, price, original_price, composition, natural_fiber_percent, category, color, matching_set_id, is_sale, region, collection_slugs, stock_status, canonical_id, is_editor_pick, editor_picked_at";

  const byKey = new Map<string, Product>();
  const ingest = (rows: any[] | null | undefined) => {
    for (const row of rows || []) {
      const product = mapProductRow(row);
      if (!isEligibleRecommendation(product)) continue;
      for (const key of productKeys(product)) byKey.set(key, product);
    }
  };

  if (uuidIds.length) {
    const { data } = await supabase.from("products").select(cols).in("id", uuidIds.slice(0, 80));
    ingest(data);
  }
  if (externalIds.length) {
    const { data } = await supabase
      .from("products")
      .select(cols)
      .in("product_id", externalIds.slice(0, 80));
    ingest(data);
  }

  return ids
    .map((id) => byKey.get(id))
    .filter((product): product is Product => Boolean(product));
}

function rankMix(
  favorites: Product[],
  catalog: Product[],
  opts: {
    detectedFiber: string;
    preferredMaterials: Set<string>;
    personaMaterials: Set<string>;
    savedIds: Set<string>;
    anchor: number;
    limit: number;
  }
): Product[] {
  const savedBrands = new Set(
    favorites
      .map((product) => String(product.brandName || "").toLowerCase())
      .filter(Boolean)
  );

  const nearFavorites: Product[] = [];
  const stretchFavorites: Product[] = [];
  for (const product of favorites) {
    const tier = classifyPriceTier(parsePrice(product.price), opts.anchor);
    if (tier === "near") nearFavorites.push(product);
    else if (tier === "stretch") stretchFavorites.push(product);
  }

  const nearSlots = Math.max(1, Math.ceil(opts.limit * 0.67));
  const stretchSlots = Math.max(1, opts.limit - nearSlots);
  const seen = new Set<string>();
  const mixed: Product[] = [];

  const append = (products: Product[], cap: number) => {
    for (const product of products) {
      if (mixed.length >= cap) break;
      const key = productKeys(product)[0];
      if (!key || seen.has(key)) continue;
      seen.add(key);
      for (const k of productKeys(product)) seen.add(k);
      mixed.push(product);
    }
  };

  append(nearFavorites, nearSlots);
  append(stretchFavorites, nearSlots + stretchSlots);

  const rankedCatalog = [...catalog].sort((a, b) => {
    const sa = scoreProduct(a, { ...opts, savedBrands });
    const sb = scoreProduct(b, { ...opts, savedBrands });
    if (sa !== sb) return sb - sa;
    if (opts.anchor > 0) {
      return Math.abs(parsePrice(a.price) - opts.anchor) - Math.abs(parsePrice(b.price) - opts.anchor);
    }
    return 0;
  });
  append(rankedCatalog, opts.limit);

  return mixed
    .sort((a, b) => scoreProduct(b, { ...opts, savedBrands }) - scoreProduct(a, { ...opts, savedBrands }))
    .slice(0, opts.limit);
}

function shopCategory(garmentType?: string | null): string | undefined {
  if (!garmentType) return undefined;
  const key = garmentType.trim().toLowerCase();
  return GARMENT_TO_CATEGORY[key] || undefined;
}

async function fetchCatalogCandidates(input: {
  fiber: string;
  region: string;
  garmentType?: string | null;
  anchor: number;
  limit: number;
}): Promise<Product[]> {
  const category = shopCategory(input.garmentType);
  const fiber = input.fiber.replace(/_/g, " ").trim() || undefined;
  const minPrice = input.anchor < 30 ? 0 : Math.max(0, input.anchor * 0.35);
  const maxPrice = input.anchor * 2.5;
  const primaryRegion = input.region === "all" ? "us" : input.region;

  // One query first; broaden only if thin so we stay under the iOS timeout.
  const attempts: Array<{ region: string; category?: string; fiber?: string }> = [
    { region: primaryRegion, category, fiber },
  ];
  if (category) {
    attempts.push({ region: primaryRegion, fiber });
  }
  if (primaryRegion !== "us") {
    attempts.push({ region: "us", category, fiber });
  }

  const out: Product[] = [];
  const seen = new Set<string>();

  for (const attempt of attempts) {
    if (out.length >= input.limit) break;
    const result = await queryCatalogBrowsePageV2({
      region: attempt.region,
      category: attempt.category,
      fiber: attempt.fiber,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice,
      sort: "price_low",
      limit: Math.min(Math.max(input.limit * 2, 16), 24),
      offset: 0,
    });
    for (const product of result.products) {
      const asProduct = product as unknown as Product;
      if (!isEligibleRecommendation(asProduct)) continue;
      if (
        looksLikeFootwear(asProduct) &&
        !String(input.garmentType || "").toLowerCase().includes("shoe")
      ) {
        continue;
      }
      const key = productKeys(asProduct)[0];
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(asProduct);
    }
  }
  return out;
}

export async function buildRecommendedProducts(
  input: RecommendProductsInput
): Promise<RecommendProductsResult> {
  const limit = Math.min(Math.max(Number(input.limit) || 8, 4), 16);
  const region = String(input.region || "us").toLowerCase() || "us";
  const detectedFiber = String(input.fiber || "cotton").toLowerCase();
  const anchor = Number(input.priceUSD) > 0 ? Number(input.priceUSD) : 50;
  const savedIds = new Set(
    (input.savedProductIds || []).map((id) => String(id || "").trim()).filter(Boolean)
  );
  const preferredMaterials = new Set(
    (input.preferredMaterials || []).map((m) => String(m || "").toLowerCase()).filter(Boolean)
  );
  const personaMaterials = new Set(
    (input.personaMaterials || []).map((m) => String(m || "").toLowerCase()).filter(Boolean)
  );
  const exclude = String(input.excludeProductId || "").trim();

  const favorites = (await resolveFavoriteProducts([...savedIds])).filter((product) => {
    if (!exclude) return true;
    return !productKeys(product).includes(exclude);
  });

  const catalog = (
    await fetchCatalogCandidates({
      fiber: detectedFiber,
      region,
      garmentType: input.garmentType,
      anchor,
      limit,
    })
  ).filter((product) => {
    if (!exclude) return true;
    return !productKeys(product).includes(exclude);
  });

  const products = rankMix(favorites, catalog, {
    detectedFiber,
    preferredMaterials,
    personaMaterials,
    savedIds,
    anchor,
    limit,
  });

  return {
    version: 1,
    source: "server",
    products,
  };
}
