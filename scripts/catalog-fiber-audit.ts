/**
 * Layer counts: products → live_products → live_products_apparel → material-page path
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/catalog-fiber-audit.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const FIBERS = ["cashmere", "silk", "linen", "cotton", "wool"] as const;

const FIBER_QUERIES: Record<string, string[]> = {
  cotton: ["cotton"],
  silk: ["silk"],
  linen: ["linen", "flax"],
  wool: ["wool", "merino"],
  cashmere: ["cashmere"],
};

const FIBER_TERMS: Record<string, string[]> = {
  cotton: ["cotton", "organic cotton"],
  linen: ["linen", "flax"],
  silk: ["silk", "mulberry silk"],
  wool: ["wool", "merino", "lambswool"],
  cashmere: ["cashmere"],
};

function getClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

function isClothingProduct(p: any): boolean {
  const cat = (p.category || "").toLowerCase();
  const name = (p.title || p.name || "").toLowerCase();
  const nonClothing = [
    "perfume", "cologne", "fragrance", "candle", "soap", "cream", "lotion", "serum", "mask",
    "shampoo", "conditioner", "body wash", "deodorant", "sunscreen", "sunglasses", "eyewear",
    "watch", "jewelry", "earring", "necklace", "bracelet", "phone case", "laptop", "tablet",
    "headband", "hair clip", "scrunchie", "umbrella", "blanket", "pillow", "towel",
    "candle holder", "vase", "keychain", "sticker", "magnet", "poster", "notebook", "pencil",
    "gift card",
  ];
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

function priceListedRow(row: any): boolean {
  const p = row.price;
  if (p == null || p === "" || p === "$0.00" || p === "0") return false;
  if (!row.image_url || String(row.image_url).trim() === "") return false;
  return true;
}

async function paginatedIdCount(
  supabase: SupabaseClient,
  table: string,
  build: (q: any) => any,
  pageSize = 1000,
  maxPages = 30
): Promise<{ count: number; truncated: boolean; error?: string }> {
  const ids = new Set<string>();
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    let q = supabase.from(table).select("id");
    q = build(q);
    const { data, error } = await q.range(from, to);
    if (error) return { count: ids.size, truncated: true, error: error.message };
    const rows = data || [];
    for (const r of rows) ids.add(String((r as { id: string }).id));
    if (rows.length < pageSize) return { count: ids.size, truncated: false };
  }
  return { count: ids.size, truncated: true };
}

async function headCount(
  supabase: SupabaseClient,
  table: string,
  build: (q: any) => any
): Promise<{ count: number | null; error?: string; timedOut?: boolean }> {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  q = build(q);
  const { count, error } = await q;
  if (error) {
    const msg = error.message || "";
    return {
      count: null,
      error: msg || "(empty error — likely timeout)",
      timedOut: msg.includes("timeout") || msg === "",
    };
  }
  return { count: count ?? 0 };
}

async function rpcCatalogList(supabase: SupabaseClient, fiber: string, limit: number) {
  const { data, error } = await supabase.rpc("catalog_list", {
    p_preferred_region: "us",
    p_fallback_region: "us",
    p_fiber: fiber,
    p_category: null,
    p_brand_slug: null,
    p_search: null,
    p_min_nfp: 80,
    p_limit: limit,
    p_offset: 0,
  });
  return { rows: (data || []) as any[], error: error?.message };
}

async function fallbackLiveApparel(supabase: SupabaseClient, term: string, limit: number) {
  const { data, error } = await supabase
    .from("live_products_apparel")
    .select("*")
    .gte("natural_fiber_percent", 80)
    .ilike("composition", `%${term}%`)
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit);
  return { rows: (data || []) as any[], error: error?.message };
}

/** Mirrors fetchProductsByFiberAndCategory (default limit 100, no category). */
async function simulateMaterialPage(supabase: SupabaseClient, slug: string) {
  const fiberQueries = FIBER_QUERIES[slug] || [slug];
  const limit = 100;
  const allProducts: any[] = [];
  const steps: Record<string, unknown> = {};

  for (const fiber of fiberQueries) {
    const terms = FIBER_TERMS[fiber] || [fiber];
    for (const term of terms) {
      const rpc = await rpcCatalogList(supabase, term, limit);
      let rows = rpc.rows;
      let source = "catalog_list";
      if (rows.length === 0) {
        const fb = await fallbackLiveApparel(supabase, term, limit);
        rows = fb.rows;
        source = rpc.error ? `fallback_after_rpc_error:${rpc.error}` : "fallback_rpc_empty";
        steps[`${term}_fallback_error`] = fb.error;
      }
      steps[`${term}_rpc`] = { count: rpc.rows.length, error: rpc.error };
      steps[`${term}_raw`] = { count: rows.length, source };
      allProducts.push(...rows);
    }
  }

  const seen = new Set<string>();
  const unique = allProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  let filtered = unique.filter(isClothingProduct).filter(isNotMensProduct);
  const afterUnique = unique.length;
  const afterClothing = unique.filter(isClothingProduct).length;
  const afterMens = unique.filter(isClothingProduct).filter(isNotMensProduct).length;

  if (filtered.length === 0) {
    const terms = (FIBER_TERMS[slug] || [slug]).flat();
    let q = supabase
      .from("live_products_apparel")
      .select("*")
      .gte("natural_fiber_percent", 80)
      .not("image_url", "is", null)
      .not("price", "is", null);
    const orParts = terms.map((t) => `composition.ilike.%${t}%`);
    if (orParts.length === 1) q = q.ilike("composition", `%${terms[0]}%`);
    else q = q.or(orParts.join(","));
    const { data, error } = await q
      .order("natural_fiber_percent", { ascending: false })
      .limit(Math.max(limit * 2, 160));
    const broad = (data || []) as any[];
    filtered = broad
      .filter(isClothingProduct)
      .filter(isNotMensProduct)
      .filter(priceListedRow);
    steps.last_resort = { raw: broad.length, after_filters: filtered.length, error };
  }

  const withPrice = filtered.filter(priceListedRow);
  return {
    material_page_result: Math.min(filtered.length, limit),
    unique_before_filters: afterUnique,
    after_clothing_only: afterClothing,
    after_clothing_and_not_mens: afterMens,
    with_price_and_image: withPrice.length,
    steps,
  };
}

async function main() {
  const supabase = getClient();
  console.log("Catalog fiber audit (layer counts + material page simulation)\n");

  const summary: Record<string, unknown> = {};

  for (const fiber of FIBERS) {
    console.log(`=== ${fiber} ===`);
    const pattern = `%${fiber}%`;

    const pHead = await headCount(supabase, "products", (q) =>
      q.eq("approved", "yes").eq("is_active", true).ilike("composition", pattern)
    );
    const pPage = await paginatedIdCount(supabase, "products", (q) =>
      q.eq("approved", "yes").eq("is_active", true).ilike("composition", pattern)
    );
    console.log("products (approved+active, composition ilike):", {
      head_count: pHead.count,
      head_error: pHead.error,
      paginated_count: pPage.count,
      paginated_truncated: pPage.truncated,
      paginated_error: pPage.error,
    });

    const lpHead = await headCount(supabase, "live_products", (q) => q.ilike("composition", pattern));
    const lpPage = await paginatedIdCount(supabase, "live_products", (q) =>
      q.ilike("composition", pattern)
    );
    console.log("live_products (composition ilike):", {
      head_count: lpHead.count,
      head_error: lpHead.error,
      paginated_count: lpPage.count,
      paginated_truncated: lpPage.truncated,
      paginated_error: lpPage.error,
    });

    const lpaHead = await headCount(supabase, "live_products_apparel", (q) =>
      q.ilike("composition", pattern)
    );
    const lpaPage = await paginatedIdCount(supabase, "live_products_apparel", (q) =>
      q.ilike("composition", pattern)
    );
    console.log("live_products_apparel (composition ilike):", {
      head_count: lpaHead.count,
      head_error: lpaHead.error,
      paginated_count: lpaPage.count,
      paginated_truncated: lpaPage.truncated,
      paginated_error: lpaPage.error,
    });

    const lpaStrict = await paginatedIdCount(supabase, "live_products_apparel", (q) =>
      q
        .gte("natural_fiber_percent", 80)
        .ilike("composition", pattern)
        .not("image_url", "is", null)
        .not("price", "is", null)
    );
    console.log("live_products_apparel (+ nfp>=80, image, price):", lpaStrict);

    const mat = await simulateMaterialPage(supabase, fiber);
    console.log("material page query result (fetchProductsByFiberAndCategory path):", mat);

    summary[fiber] = {
      products: pPage.count,
      products_head_failed: pHead.timedOut || !!pHead.error,
      live_products: lpPage.count,
      live_products_apparel: lpaPage.count,
      live_products_apparel_strict: lpaStrict.count,
      material_page: mat.material_page_result,
    };
    console.log("");
  }

  console.log("--- SUMMARY TABLE ---");
  console.log(
    "fiber\tproducts\tlive_products\tlive_products_apparel\tlpa_strict\tmaterial_page"
  );
  for (const fiber of FIBERS) {
    const s = summary[fiber] as Record<string, number>;
    console.log(
      `${fiber}\t${s.products}\t${s.live_products}\t${s.live_products_apparel}\t${s.live_products_apparel_strict}\t${s.material_page}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
