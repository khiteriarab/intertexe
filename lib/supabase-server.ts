import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || "";
}

function getSupabaseKey(): string {
  return process.env.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || "";
}

export function getServerSupabase() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
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
}

const WOMEN_FASHION_BRAND_SLUGS = new Set([
  "a-l-c-", "agolde", "anine-bing", "diesel", "frame", "khaite",
  "l-agence", "rachel-comey", "re-done", "reformation", "rixo",
  "sandro", "sea-new-york", "the-kooples", "tibi", "toteme"
]);

function mapProductRow(row: any): Product {
  return {
    id: row.id,
    brandSlug: row.brand_slug || "",
    brandName: row.brand_name || "",
    name: row.title || row.name || "",
    productId: row.product_id || row.id,
    url: row.url || "",
    imageUrl: row.image_url || "",
    price: row.price || "",
    composition: row.composition || "",
    naturalFiberPercent: row.natural_fiber_percent || 0,
    category: row.category || "",
    matchingSetId: row.matching_set_id || null,
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
  const nonClothing = ["perfume", "cologne", "fragrance", "candle", "soap", "cream", "lotion", "serum", "mask", "oil", "balm", "mist", "shampoo", "conditioner", "body wash", "deodorant", "sunscreen", "sunglasses", "eyewear", "watch", "jewelry", "earring", "necklace", "bracelet", "ring", "charm", "pendant", "brooch", "phone case", "laptop", "tablet", "headband", "hair clip", "scrunchie", "umbrella", "blanket", "pillow", "towel", "candle holder", "vase", "mug", "cup", "plate", "bowl", "tray", "keychain", "sticker", "magnet", "poster", "print", "book", "notebook", "pen", "pencil", "gift card"];
  for (const term of nonClothing) {
    if (cat.includes(term) || name.includes(term)) return false;
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
  return data.map(mapDesignerRow);
}

export async function fetchDesignerBySlug(slug: string): Promise<Designer | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("designers")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error || !data) return null;
  return mapDesignerRow(data);
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
  return mapProductRow(data[0]);
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

  const terms = fiberTerms[fiber.toLowerCase()] || [fiber];
  let allProducts: any[] = [];

  for (const term of terms) {
    let q = supabase
      .from("products")
      .select("*")
      .ilike("composition", `%${term}%`)
      .order("natural_fiber_percent", { ascending: false })
      .limit(limit);

    if (category) {
      q = q.ilike("category", `%${category}%`);
    }

    const { data } = await q;
    if (data) allProducts.push(...data);
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
    .order("natural_fiber_percent", { ascending: false });

  if (error || !data) return [];
  return data.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
}

export async function fetchAllProducts(limit = 200, offset = 0): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("natural_fiber_percent", { ascending: false })
    .range(offset, offset + limit - 1);

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
      .ilike("composition", `%${fiber}%`);
    if (!error && count) counts[fiber] = count;
  }));
  return counts;
}

export async function fetchProductCount(): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
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
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
}

function isWomensFashionBrand(slug: string): boolean {
  return WOMEN_FASHION_BRAND_SLUGS.has(slug);
}

export async function fetchProductsByFiber(fiber: string): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("approved", "yes")
    .ilike("composition", `%${fiber}%`)
    .order("natural_fiber_percent", { ascending: false });
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
    .eq("approved", "yes")
    .eq("brand_slug", brandSlug)
    .not("image_url", "is", null)
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
      .eq("approved", "yes")
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
    .eq("approved", "yes")
    .not("image_url", "is", null)
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

export async function fetchShopProducts(options: {
  fiber?: string;
  category?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ products: Product[]; total: number }> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: 0 };
  const { fiber, category, sort = "recommended", limit = 60, offset = 0, search } = options;
  const brandSlugs = [...WOMEN_FASHION_BRAND_SLUGS];

  let query = supabase
    .from("products")
    .select("id, brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category", { count: "exact" })
    .eq("approved", "yes")
    .not("image_url", "is", null)
    .in("brand_slug", brandSlugs);

  if (search && search.trim().length >= 2) {
    query = query.or(`name.ilike.%${search}%,brand_name.ilike.%${search}%,composition.ilike.%${search}%`);
  }
  if (fiber) query = query.ilike("composition", `%${fiber}%`);
  if (category) query = query.ilike("category", `%${category}%`);

  if (sort === "price-low") query = query.order("price", { ascending: true });
  else if (sort === "price-high") query = query.order("price", { ascending: false });
  else query = query.order("natural_fiber_percent", { ascending: false });

  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error || !data) return { products: [], total: 0 };

  return {
    products: data.filter((row: any) => isClothingProduct(row) && isNotMensProduct(row)).map(mapProductRow),
    total: count || 0,
  };
}
