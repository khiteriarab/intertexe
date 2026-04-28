import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || "";
}

function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function getAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || "";
}

export function getServerSupabase() {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey() || getAnonKey();
  if (!url || !key) {
    console.warn("Missing Supabase environment variables — returning null client. Checked: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, VITE_SUPABASE_URL");
    return null;
  }
  return createClient(url, key);
}

export interface Designer {
  id: string;
  name: string;
  slug: string;
  status: string;
  naturalFiberPercent: number | null;
  description: string | null;
  website: string | null;
  createdAt: string | null;
}

export interface Product {
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
  matchingSetId?: string | null;
  isSale?: boolean;
  originalPrice?: string | null;
}

type MarketFilter = "us-ca" | "eu-uk-me";

const WOMEN_FASHION_BRAND_SLUGS = new Set([
  "7-for-all-mankind",
  "a-l-c-", "a-l-c", "agolde", "aje", "amanda-uprichard", "anine-bing", "anne-klein", "astr",
  "bella-dahl", "camilla-and-marc", "cece", "citizens-of-humanity", "cleobella", "club-monaco",
  "derek-lam", "diesel", "dissh", "dl1961", "elan", "esse-studios",
  "faithfull-the-brand", "fleur-du-mal", "frame", "free-people", "grlfrnd",
  "hale-bob", "hutch", "isabel-marant",
  "j-mclaughlin", "joes-jeans", "johnny-was", "joseph",
  "khaite", "l-agence", "lafayette-148", "lilla-p",
  "marie-oliver", "mother", "nation-ltd", "nic-and-zoe", "nicole-miller", "nili-lotan", "nydj",
  "paige", "pj-salvage", "pistola",
  "rachel-comey", "rag-and-bone", "rails", "ramy-brook", "re-done", "rebecca-taylor", "reformation", "rixo",
  "sanctuary", "sandro", "sea-new-york", "something-navy", "splendid", "st-agni",
  "tanya-taylor", "ted-baker", "the-kooples", "theory", "tibi", "toteme", "trina-turk",
  "ulla-johnson", "veda", "velvet-by-graham-spencer", "veronica-beard", "vince",
  "cult-gaia", "stine-goya"
]);

const MYTHERESA_PRODUCT_PREFIXES: Record<MarketFilter, string> = {
  "us-ca": "mytheresa-us-ca-",
  "eu-uk-me": "mytheresa-eu-uk-me-",
};

function applyCatalogFilter(query: any, market?: string) {
  const brandSlugs = [...WOMEN_FASHION_BRAND_SLUGS].join(",");
  if (market === "us-ca") {
    return (query as any)
      .not("product_id", "ilike", `${MYTHERESA_PRODUCT_PREFIXES["eu-uk-me"]}%`)
      .not("price", "ilike", "\u00A3%")
      .not("price", "ilike", "\u20AC%");
  }
  if (market === "eu-uk-me") {
    return (query as any).or(
      `product_id.ilike.${MYTHERESA_PRODUCT_PREFIXES["eu-uk-me"]}%,price.ilike.\u00A3%,price.ilike.\u20AC%`
    );
  }
  return (query as any).or(`brand_slug.in.(${brandSlugs}),product_id.ilike.mytheresa-%`);
}

function fixIsabelMarantImage(brandSlug: string, imageUrl: string): string {
  return imageUrl;
}

function mapProductRow(row: any): Product {
  const brandSlug = row.brand_slug || "";
  const rawImageUrl = row.image_url || "";
  return {
    id: row.id,
    brandSlug,
    brandName: row.brand_name || "",
    name: row.title || row.name || "",
    productId: row.product_id || row.id,
    url: row.url || "",
    imageUrl: fixIsabelMarantImage(brandSlug, rawImageUrl),
    price: row.price || "",
    composition: row.composition || "",
    naturalFiberPercent: row.natural_fiber_percent || 0,
    category: row.category || "",
    matchingSetId: row.matching_set_id || null,
    isSale: row.is_sale || false,
    originalPrice: row.original_price || null,
  };
}

function mapDesignerRow(row: any): Designer {
  return {
    id: row.id?.toString?.() ?? String(row.id),
    name: row.name || "",
    slug: row.slug || "",
    status: row.status || "active",
    naturalFiberPercent: row.natural_fiber_percent ?? null,
    description: row.description || null,
    website: row.website || null,
    createdAt: row.created_at || null,
  };
}

function isClothingProduct(p: any): boolean {
  const cat = (p.category || "").toLowerCase();
  const name = (p.title || p.name || "").toLowerCase();
  const nonClothing = ["perfume", "cologne", "fragrance", "candle", "soap", "cream", "lotion", "serum", "mask", "shampoo", "conditioner", "body wash", "deodorant", "sunscreen", "sunglasses", "eyewear", "watch", "jewelry", "earring", "necklace", "bracelet", "phone case", "laptop", "tablet", "headband", "hair clip", "scrunchie", "umbrella", "blanket", "pillow", "towel", "candle holder", "vase", "keychain", "sticker", "magnet", "poster", "notebook", "pencil", "gift card"];
  const text = cat + " " + name;
  for (const term of nonClothing) {
    const re = new RegExp(`\\b${term}\\b`);
    if (re.test(text)) return false;
  }
  return true;
}

function isNotMensProduct(p: any): boolean {
  const name = (p.title || p.name || "").toLowerCase();
  const cat = (p.category || "").toLowerCase();
  const mensTerms = ["men's", "mens ", " men ", "for men", "man's", "male ", " male", "boy's", "boys "];
  for (const term of mensTerms) {
    if (name.includes(term) || cat.includes(term)) {
      if (name.includes("boxer short") || name.includes("boyfriend")) return true;
      return false;
    }
  }
  return true;
}

export async function fetchDesignersByNames(names: string[]): Promise<Designer[]> {
  const supabase = getServerSupabase();
  if (!supabase || names.length === 0) return [];
  const { data, error } = await supabase
    .from("designers")
    .select("*")
    .in("name", names);
  if (error || !data) return [];
  return data.map(mapDesignerRow);
}

export async function fetchDesignersByIds(ids: (string | number)[]): Promise<Designer[]> {
  const supabase = getServerSupabase();
  if (!supabase || ids.length === 0) return [];
  const stringIds = ids.map(id => String(id)).filter(Boolean);
  if (stringIds.length === 0) return [];
  const { data, error } = await supabase
    .from("designers")
    .select("*")
    .in("id", stringIds);
  if (error || !data) return [];
  return data.map(mapDesignerRow);
}

export async function fetchDesigners(query?: string, limit?: number): Promise<Designer[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  let q = supabase.from("designers").select("*").order("name");
  if (query) q = q.ilike("name", `%${query}%`);
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error || !data) return [];
  const seen = new Set<string>();
  return data.map(mapDesignerRow).filter(d => {
    if (seen.has(d.slug)) return false;
    seen.add(d.slug);
    return true;
  });
}

export async function fetchDesignerBySlug(slug: string): Promise<Designer | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("designers")
    .select("*")
    .eq("slug", slug)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return mapDesignerRow(data[0]);
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  let query;
  const isNumeric = /^\d+$/.test(id);
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isNumeric) {
    query = supabase.from("products").select("*").eq("product_id", id);
  } else if (isUUID) {
    query = supabase.from("products").select("*").eq("id", id);
  } else {
    query = supabase.from("products").select("*").eq("id", id);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  if (row.natural_fiber_percent != null && row.natural_fiber_percent < 80) return null;
  return mapProductRow(row);
}

export async function fetchProductsByFiberAndCategory(
  fiber: string,
  category?: string,
  limit = 100
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const fiberTerms: Record<string, string[]> = {
    cotton: ["cotton", "organic cotton"],
    linen: ["linen", "flax"],
    silk: ["silk", "mulberry silk"],
    wool: ["wool", "merino", "lambswool"],
    cashmere: ["cashmere"],
  };

  const denimNameTerms = ["denim", "jean"];

  const fiberInputs = fiber.split(",").map(f => f.trim().toLowerCase()).filter(Boolean);
  const terms = fiberInputs.flatMap(f => fiberTerms[f] || [f]);
  const hasDenimTerm = fiberInputs.some(f => f === "denim" || f === "jeans" || f === "jean");
  let allProducts: any[] = [];

  for (const term of terms) {
    let q = supabase
      .from("products")
      .select("*")
      .ilike("composition", `%${term}%`)
      .gte("natural_fiber_percent", 80)
      .order("natural_fiber_percent", { ascending: false })
      .limit(limit);

    if (category) {
      q = q.eq("category", category);
    }

    const { data } = await q;
    if (data) allProducts.push(...data);
  }

  if (hasDenimTerm) {
    for (const nameTerm of denimNameTerms) {
      let q = supabase
        .from("products")
        .select("*")
        .ilike("name", `%${nameTerm}%`)
        .gte("natural_fiber_percent", 80)
        .order("natural_fiber_percent", { ascending: false })
        .limit(limit);

      if (category) {
        q = q.eq("category", category);
      }

      const { data } = await q;
      if (data) allProducts.push(...data);
    }
  }

  const seen = new Set<string>();
  const unique = allProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return unique
    .filter(isClothingProduct)
    .filter(isNotMensProduct)
    .slice(0, limit)
    .map(mapProductRow);
}

export async function fetchProductsByBrand(brandSlug: string): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("brand_slug", brandSlug)
    .gte("natural_fiber_percent", 80)
    .order("natural_fiber_percent", { ascending: false });

  if (error || !data) return [];
  return data.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
}

export async function fetchAllProducts(limit = 200, offset = 0, category?: string): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  let q = supabase
    .from("products")
    .select("*")
    .gte("natural_fiber_percent", 80)
    .order("natural_fiber_percent", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    q = q.eq("category", category);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  return data.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase || ids.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", ids);
  if (error || !data) return [];
  return data.map(mapProductRow);
}

export async function fetchFiberCounts(): Promise<Record<string, number>> {
  const supabase = getServerSupabase();
  if (!supabase) return {};
  const fibers = ["cashmere", "silk", "wool", "cotton", "linen"];
  const counts: Record<string, number> = {};
  await Promise.all(fibers.map(async (fiber) => {
    const { count, error } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .ilike("composition", `%${fiber}%`)
      .gte("natural_fiber_percent", 80);
    if (!error && count) counts[fiber] = count;
  }));
  return counts;
}

export async function fetchProductCount(): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .gte("natural_fiber_percent", 80);
  if (error) return 0;
  return count || 0;
}

export async function fetchAllProductIds(): Promise<string[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const ids: string[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .range(offset, offset + pageSize - 1);

    if (error || !data || data.length === 0) break;
    ids.push(...data.map((r: any) => r.id));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return ids;
}

export async function fetchAllDesignerSlugs(): Promise<string[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("designers")
    .select("slug")
    .order("name");
  if (error || !data) return [];
  return data.map((r: any) => r.slug).filter(Boolean);
}

export async function fetchRelatedProducts(
  product: Product,
  limit = 8
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("brand_slug", product.brandSlug)
    .neq("id", product.id)
    .gte("natural_fiber_percent", 80)
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
}

function isWomensFashionBrand(slug: string): boolean {
  return WOMEN_FASHION_BRAND_SLUGS.has(slug);
}

export async function fetchProductsByFiber(fiber: string, limit = 200): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .ilike("composition", `%${fiber}%`)
    .gte("natural_fiber_percent", 80)
    .not("price", "is", null)
    .neq("price", "")
    .neq("price", "$0.00")
    .neq("price", "0")
    .not("image_url", "is", null)
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data
    .filter((row: any) => isClothingProduct(row) && isWomensFashionBrand(row.brand_slug || "") && isNotMensProduct(row))
    .map(mapProductRow);
}

export async function fetchProductsByBrandWithImages(brandSlug: string, limit = 24): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("id, brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category")
    .eq("brand_slug", brandSlug)
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .neq("price", "")
    .neq("price", "$0.00")
    .neq("price", "0")
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data
    .filter((row: any) => isClothingProduct(row) && isNotMensProduct(row))
    .map(mapProductRow);
}

export async function fetchProductCountsByBrand(slugs: string[]): Promise<Record<string, number>> {
  const supabase = getServerSupabase();
  if (!supabase) return {};
  const counts: Record<string, number> = {};
  await Promise.all(slugs.map(async (slug) => {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("brand_slug", slug)
      .gte("natural_fiber_percent", 80)
      .not("image_url", "is", null);
    counts[slug] = count || 0;
  }));
  return counts;
}

export async function fetchRecommendedProducts(
  materialTerms: string[],
  excludeBrandSlugs: string[],
  limit = 50
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  let query = supabase
    .from("products")
    .select("id, brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category")
    .not("image_url", "is", null)
    .gte("natural_fiber_percent", 80)
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit * 5);

  if (excludeBrandSlugs.length > 0) {
    query = query.not("brand_slug", "in", `(${excludeBrandSlugs.join(",")})`);
  }

  if (materialTerms.length === 1) {
    query = query.ilike("composition", `%${materialTerms[0]}%`);
  } else if (materialTerms.length > 1) {
    const orFilter = materialTerms.map(t => `composition.ilike.%${t}%`).join(",");
    query = query.or(orFilter);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const filtered = data
    .filter((row: any) => isClothingProduct(row) && isWomensFashionBrand(row.brand_slug || ""));

  const scored = filtered.map((row: any) => {
    const comp = (row.composition || "").toLowerCase();
    let relevance = 0;
    for (const term of materialTerms) {
      const t = term.toLowerCase();
      if (!comp.includes(t)) continue;
      const pctMatch = comp.match(new RegExp(`(\\d+)\\s*%\\s*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))
        || comp.match(new RegExp(`${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^,]*?(\\d+)\\s*%`, 'i'));
      if (pctMatch) {
        relevance = Math.max(relevance, parseInt(pctMatch[1], 10));
      } else {
        relevance = Math.max(relevance, 40);
      }
    }
    return { row, relevance };
  });

  scored.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return (b.row.natural_fiber_percent || 0) - (a.row.natural_fiber_percent || 0);
  });

  return scored.slice(0, limit).map(({ row }) => mapProductRow(row));
}

function parsePrice(price: string | null | undefined): number {
  if (!price) return Infinity;
  const cleaned = price.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? Infinity : num;
}

export async function fetchShopProducts(options: {
  fiber?: string;
  category?: string;
  market?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ products: Product[]; total: number }> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: 0 };
  const { fiber, category, market, sort = "recommended", limit = 60, offset = 0, search } = options;
  const isPriceSort = sort === "price-low" || sort === "price-high";

  const searchSynonyms: Record<string, string[]> = {
    jeans: ["jean", "denim"],
    jean: ["jeans", "denim"],
    denim: ["jean", "jeans"],
  };

  let searchTerms: string[] = [];
  if (search && search.trim().length >= 2) {
    const s = search.trim().toLowerCase();
    searchTerms = [s, ...(searchSynonyms[s] || [])];
  }

  let query = applyCatalogFilter(supabase
    .from("products")
    .select("id, brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category", { count: "exact" })
    .not("image_url", "is", null)
    .neq("image_url", "")
    .not("price", "is", null)
    .neq("price", "")
    .neq("price", "$0.00")
    .neq("price", "0")
    .gte("natural_fiber_percent", 80), market);

  if (searchTerms.length > 0) {
    const orClauses = searchTerms.flatMap(t => [
      `name.ilike.%${t}%`,
      `brand_name.ilike.%${t}%`,
      `composition.ilike.%${t}%`,
    ]);
    query = query.or(orClauses.join(","));
  }
  if (fiber) query = query.ilike("composition", `%${fiber}%`);
  if (category) query = query.eq("category", category);

  if (isPriceSort) {
    const pageSize = 1000;
    let allRows: any[] = [];
    let fetchOffset = 0;
    while (true) {
      let q2 = applyCatalogFilter(supabase
        .from("products")
        .select("id, brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category")
        .not("image_url", "is", null)
        .not("price", "is", null)
        .neq("price", "")
        .neq("price", "$0.00")
        .neq("price", "0")
        .gte("natural_fiber_percent", 80), market);
      if (searchTerms.length > 0) {
        const orClauses = searchTerms.flatMap(t => [
          `name.ilike.%${t}%`,
          `brand_name.ilike.%${t}%`,
          `composition.ilike.%${t}%`,
        ]);
        q2 = q2.or(orClauses.join(","));
      }
      if (fiber) q2 = q2.ilike("composition", `%${fiber}%`);
      if (category) q2 = q2.eq("category", category);
      q2 = q2.range(fetchOffset, fetchOffset + pageSize - 1);
      const { data: chunk, error: chunkErr } = await q2;
      if (chunkErr || !chunk || chunk.length === 0) break;
      allRows.push(...chunk);
      if (chunk.length < pageSize) break;
      fetchOffset += pageSize;
    }

    const filtered = allRows
      .filter((row: any) => isClothingProduct(row) && isNotMensProduct(row));

    filtered.sort((a: any, b: any) => {
      const pa = parsePrice(a.price);
      const pb = parsePrice(b.price);
      return sort === "price-low" ? pa - pb : pb - pa;
    });

    return {
      products: filtered.slice(offset, offset + limit).map(mapProductRow),
      total: filtered.length,
    };
  }

  query = query.order("natural_fiber_percent", { ascending: false });
  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error || !data) return { products: [], total: 0 };

  return {
    products: data.filter((row: any) => isClothingProduct(row) && isNotMensProduct(row)).map(mapProductRow),
    total: count || 0,
  };
}

const PRODUCT_CARD_COLS = "id, brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category, is_sale, original_price";

export async function fetchMoreFromBrand(
  productId: string,
  brandSlug: string,
  limit = 4
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_CARD_COLS)
    .eq("brand_slug", brandSlug)
    .neq("id", productId)
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
}

export async function fetchMoreInFiber(
  productId: string,
  composition: string | null,
  limit = 4
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase || !composition) return [];
  const fibers = ["silk", "cotton", "linen", "wool", "cashmere", "merino", "mohair", "alpaca", "hemp"];
  const lower = composition.toLowerCase();
  const primaryFiber = fibers.find((f) => lower.includes(f));
  if (!primaryFiber) return [];
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_CARD_COLS)
    .neq("id", productId)
    .ilike("composition", `%${primaryFiber}%`)
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
}

export async function fetchMoreAtPrice(
  productId: string,
  price: string | null,
  limit = 4
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase || !price) return [];
  const numPrice = parseFloat(price.replace(/[^0-9.]/g, ""));
  if (!numPrice || numPrice <= 0) return [];
  const low = numPrice * 0.8;
  const high = numPrice * 1.2;
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_CARD_COLS)
    .neq("id", productId)
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .order("natural_fiber_percent", { ascending: false })
    .limit(60);
  if (error || !data) return [];
  const filtered = data
    .filter(isClothingProduct)
    .filter(isNotMensProduct)
    .filter((row: any) => {
      const p = parseFloat((row.price || "0").replace(/[^0-9.]/g, ""));
      return p >= low && p <= high;
    });
  return filtered.slice(0, limit).map(mapProductRow);
}

export async function fetchSaleProducts(options: {
  fiber?: string;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}): Promise<{ products: Product[]; total: number }> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: 0 };
  const { fiber, maxPrice, limit = 60, offset = 0 } = options;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("is_sale", true)
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null);

  if (fiber && fiber !== "all") {
    query = query.ilike("composition", `%${fiber}%`);
  }

  query = query.order("natural_fiber_percent", { ascending: false });
  const { data, error, count } = await query;
  if (error || !data) return { products: [], total: 0 };

  let filtered = data
    .filter((row: any) => isClothingProduct(row) && isNotMensProduct(row));

  if (maxPrice) {
    filtered = filtered.filter((row: any) => {
      const p = parseFloat((row.price || "0").replace(/[^0-9.]/g, ""));
      return p > 0 && p <= maxPrice;
    });
  }

  const brandGroups: Record<string, any[]> = {};
  for (const row of filtered) {
    const b = row.brand_slug || "other";
    if (!brandGroups[b]) brandGroups[b] = [];
    brandGroups[b].push(row);
  }
  const queues = Object.values(brandGroups);
  const interleaved: any[] = [];
  let round = 0;
  while (interleaved.length < filtered.length) {
    let added = false;
    for (const q of queues) {
      if (round < q.length) {
        interleaved.push(q[round]);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }

  return {
    products: interleaved.slice(offset, offset + limit).map(mapProductRow),
    total: interleaved.length,
  };
}

export async function fetchBrandStats(): Promise<{ slug: string; name: string; count: number; avgNaturalFiber: number }[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const brandSlugs = [...WOMEN_FASHION_BRAND_SLUGS];
  const allProducts: { brand_slug: string; brand_name: string; natural_fiber_percent: number }[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data } = await applyCatalogFilter(supabase
      .from("products")
      .select("brand_slug, brand_name, natural_fiber_percent")
      .gte("natural_fiber_percent", 80)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .not("price", "is", null)
      .neq("price", "")
      .range(offset, offset + pageSize - 1));

    if (!data || data.length === 0) break;
    allProducts.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  const brandMap = new Map<string, { name: string; totalFiber: number; count: number }>();
  for (const p of allProducts) {
    const existing = brandMap.get(p.brand_slug);
    if (existing) {
      existing.totalFiber += (p.natural_fiber_percent || 0);
      existing.count += 1;
    } else {
      brandMap.set(p.brand_slug, {
        name: p.brand_name,
        totalFiber: p.natural_fiber_percent || 0,
        count: 1,
      });
    }
  }

  const results = Array.from(brandMap.entries())
    .map(([slug, data]) => ({
      slug,
      name: data.name,
      count: data.count,
      avgNaturalFiber: Math.round(data.totalFiber / data.count),
    }))
    .filter(b => b.count >= 2)
    .sort((a, b) => b.count - a.count);

  return results;
}
