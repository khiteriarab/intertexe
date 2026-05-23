/**
 * Canonical shoppable brand list — brands with ≥2 live offers (image + price, NFP ≥80).
 * Uses catalog_brand_directory RPC when fast; full paginated scan when RPC times out.
 */
import { sanitizeBrandName } from "./brand-display";
import { getServerSupabase } from "./supabase-service-client";
import { logSupabaseTiming } from "./supabase-timing";

export const SHOPPABLE_MIN_PRODUCTS = 2;
const PAGE_SIZE = 1000;
/** Covers ~35k offers; stop early when a page is short. */
const MAX_SCAN_PAGES = 40;
const RPC_TIMEOUT_MS = 18_000;

export type ShoppableBrand = {
  slug: string;
  name: string;
  count: number;
  avgNaturalFiber: number;
};

type DirectoryRow = {
  brand_slug: string;
  brand_name: string;
  product_count: number;
  avg_natural_fiber: number;
};

function parseShoppablePrice(price: unknown): number {
  const n = parseFloat(String(price ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function mapDirectoryRows(
  rows: DirectoryRow[]
): ShoppableBrand[] {
  const bySlug = new Map<string, ShoppableBrand>();
  for (const r of rows) {
    const slug = String(r.brand_slug || "")
      .trim()
      .toLowerCase();
    if (!slug) continue;
    const count = Number(r.product_count) || 0;
    if (count < SHOPPABLE_MIN_PRODUCTS) continue;
    const name = sanitizeBrandName(r.brand_name || slug);
    const avgNaturalFiber = Number(r.avg_natural_fiber) || 0;
    const prev = bySlug.get(slug);
    if (!prev || count > prev.count) {
      bySlug.set(slug, { slug, name, count, avgNaturalFiber });
    }
  }
  return [...bySlug.values()].sort((a, b) => b.count - a.count);
}

async function fetchViaRpc(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>
): Promise<ShoppableBrand[] | null> {
  const t0 = Date.now();
  try {
    const result = await Promise.race([
      supabase.rpc("catalog_brand_directory", { p_limit: 1200 }),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), RPC_TIMEOUT_MS)
      ),
    ]);
    const { data, error } = result;
    if (error || !data?.length) {
      logSupabaseTiming(
        "catalog_brand_directory",
        t0,
        error ? `miss:${error.message}` : "empty"
      );
      return null;
    }
    const mapped = mapDirectoryRows(data as DirectoryRow[]);
    logSupabaseTiming("catalog_brand_directory", t0, `brands:${mapped.length}`);
    return mapped;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logSupabaseTiming("catalog_brand_directory", t0, `err:${msg}`);
    return null;
  }
}

async function fetchViaCountRpc(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("catalog_shoppable_brand_count", {
      p_min_products: SHOPPABLE_MIN_PRODUCTS,
    });
    if (error || data == null) return null;
    const n = Number(data);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Full-table paginated scan — reliable when directory RPC times out. */
async function fetchViaPaginatedScan(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  maxBrands: number
): Promise<ShoppableBrand[]> {
  const t0 = Date.now();
  const agg = new Map<string, { name: string; count: number; nfpSum: number }>();
  let offset = 0;

  for (let page = 0; page < MAX_SCAN_PAGES; page++) {
    const { data, error } = await supabase
      .from("live_products_apparel")
      .select("brand_slug, brand_name, natural_fiber_percent, image_url, price")
      .gte("natural_fiber_percent", 80)
      .not("brand_slug", "is", null)
      .not("image_url", "is", null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error || !data?.length) break;

    for (const row of data) {
      const slug = String(row.brand_slug || "").trim().toLowerCase();
      if (!slug) continue;
      if (!String(row.image_url || "").trim()) continue;
      if (parseShoppablePrice(row.price) <= 0) continue;

      const nfp = Number(row.natural_fiber_percent) || 0;
      const name = sanitizeBrandName(String(row.brand_name || slug));
      const cur = agg.get(slug) || { name, count: 0, nfpSum: 0 };
      cur.count += 1;
      cur.nfpSum += nfp;
      if (!cur.name && name) cur.name = name;
      agg.set(slug, cur);
    }

    offset += data.length;
    if (data.length < PAGE_SIZE) break;
  }

  const brands = [...agg.entries()]
    .map(([slug, v]) => ({
      slug,
      name: v.name || slug,
      count: v.count,
      avgNaturalFiber: v.count > 0 ? Math.round(v.nfpSum / v.count) : 0,
    }))
    .filter((b) => b.count >= SHOPPABLE_MIN_PRODUCTS)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxBrands);

  logSupabaseTiming(
    "shoppable_brands_scan",
    t0,
    `brands:${brands.length} pages:${Math.ceil(offset / PAGE_SIZE)}`
  );
  return brands;
}

export async function fetchShoppableBrands(opts?: {
  maxBrands?: number;
}): Promise<ShoppableBrand[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const maxBrands = opts?.maxBrands ?? 1200;

  const rpcBrands = await fetchViaRpc(supabase);
  if (rpcBrands?.length) return rpcBrands.slice(0, maxBrands);

  return fetchViaPaginatedScan(supabase, maxBrands);
}

export async function fetchShoppableBrandCount(): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;

  const countRpc = await fetchViaCountRpc(supabase);
  if (countRpc != null) return countRpc;

  const brands = await fetchShoppableBrands({ maxBrands: 2000 });
  return brands.length;
}
