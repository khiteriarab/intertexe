import { createClient } from "@supabase/supabase-js";
import type { KhiterisEditConfig, KhiterisEditProduct } from "./khiteris-edit";
import { catalogRegionFallbackChain } from "./geo-detect";

function supabaseAdmin() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizeBrand(brand: string): string {
  return brand.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function brandMatches(catalogBrand: string | null | undefined, editBrand: string): boolean {
  if (!catalogBrand) return false;
  const a = normalizeBrand(catalogBrand);
  const b = normalizeBrand(editBrand);
  return a.includes(b) || b.includes(a);
}

type CatalogUrlRow = {
  name: string;
  brand_name: string | null;
  region: string | null;
  url: string | null;
};

function buildUrlIndex(rows: CatalogUrlRow[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const row of rows) {
    if (!row.url?.trim() || !row.name || !row.region) continue;
    const key = `${row.name.trim().toLowerCase()}|${row.region.toLowerCase()}`;
    if (!index.has(key)) {
      index.set(key, row.url);
    }
  }
  return index;
}

function resolveProductHref(
  product: KhiterisEditProduct,
  index: Map<string, string>,
  rows: CatalogUrlRow[],
  regionChain: string[]
): string {
  const nameKey = product.name.trim().toLowerCase();

  for (const region of regionChain) {
    const indexed = index.get(`${nameKey}|${region}`);
    if (indexed) return indexed;

    const row = rows.find(
      (r) =>
        r.name?.trim().toLowerCase() === nameKey &&
        r.region?.toLowerCase() === region &&
        brandMatches(r.brand_name, product.brand) &&
        r.url?.trim()
    );
    if (row?.url) return row.url;
  }

  return product.href;
}

/**
 * Swap static Khiteri hrefs for catalog affiliate URLs matching the visitor's region.
 * Falls back to the configured `href`, then other regions in the chain.
 */
export async function resolveKhiterisEditForRegion(
  config: KhiterisEditConfig,
  catalogRegion: string
): Promise<KhiterisEditConfig> {
  const sb = supabaseAdmin();
  if (!sb || config.products.length === 0) {
    return config;
  }

  const regionChain = catalogRegionFallbackChain(catalogRegion);
  const regionsToFetch = [...new Set([...regionChain, "us", "uk", "eu"])];
  const productNames = [...new Set(config.products.map((p) => p.name.trim()))];

  const { data, error } = await sb
    .from("products")
    .select("name, brand_name, region, url")
    .in("name", productNames)
    .in("region", regionsToFetch)
    .not("url", "is", null)
    .limit(productNames.length * regionsToFetch.length * 4);

  if (error || !data?.length) {
    return config;
  }

  const rows = data as CatalogUrlRow[];
  const index = buildUrlIndex(rows);

  const products = config.products.map((product) => ({
    ...product,
    href: resolveProductHref(product, index, rows, regionChain),
  }));

  return { ...config, products };
}
