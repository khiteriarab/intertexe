import { createClient } from "@supabase/supabase-js";
import type { KhiterisEditConfig, KhiterisEditProduct } from "./khiteris-edit";
import { catalogRegionFallbackChain } from "./geo-detect";

type CatalogRegion = "us" | "uk" | "eu" | "ca";

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
  image_url: string | null;
  is_displayable: boolean | null;
};

function skuHint(product: KhiterisEditProduct): string | undefined {
  if (product.catalogSku?.trim()) {
    return product.catalogSku.trim().toUpperCase();
  }
  const fromImage = product.image.src.match(/P0\d{5,}/i)?.[0];
  return fromImage?.toUpperCase();
}

function decodeAffiliateDest(url: string): string {
  const match = url.match(/murl=([^&]+)/i);
  return match ? decodeURIComponent(match[1]).toLowerCase() : url.toLowerCase();
}

function scoreCatalogRow(row: CatalogUrlRow, product: KhiterisEditProduct): number {
  if (!row.url?.trim() || !brandMatches(row.brand_name, product.brand)) {
    return -1;
  }

  let score = 0;
  if (row.is_displayable === true) score += 100;

  const hint = skuHint(product);
  const dest = decodeAffiliateDest(row.url);
  const image = (row.image_url || "").toLowerCase();

  if (hint) {
    if (dest.includes(hint.toLowerCase())) score += 80;
    if (image.includes(hint.toLowerCase())) score += 40;
  }

  if (product.image.src && image && image === product.image.src.toLowerCase()) {
    score += 60;
  }

  return score;
}

function hrefFromCuratedRegions(
  product: KhiterisEditProduct,
  regionChain: string[]
): string | undefined {
  const byRegion = product.hrefByRegion;
  if (!byRegion) return undefined;

  for (const region of regionChain) {
    const key = region as CatalogRegion;
    const href = byRegion[key]?.trim();
    if (href) return href;
  }
  return undefined;
}

function bestCatalogUrl(
  rows: CatalogUrlRow[],
  product: KhiterisEditProduct,
  region: string
): string | undefined {
  const candidates = rows.filter(
    (row) =>
      row.name?.trim().toLowerCase() === product.name.trim().toLowerCase() &&
      row.region?.toLowerCase() === region.toLowerCase()
  );

  let best: { url: string; score: number } | undefined;
  for (const row of candidates) {
    const score = scoreCatalogRow(row, product);
    if (score < 0 || !row.url) continue;
    if (!best || score > best.score) {
      best = { url: row.url, score };
    }
  }

  return best && best.score >= 100 ? best.url : undefined;
}

function resolveProductHref(
  product: KhiterisEditProduct,
  rows: CatalogUrlRow[],
  regionChain: string[]
): string {
  const curated = hrefFromCuratedRegions(product, regionChain);
  if (curated) return curated;

  for (const region of regionChain) {
    const url = bestCatalogUrl(rows, product, region);
    if (url) return url;
  }

  return product.href;
}

/**
 * Swap static Khiteri hrefs for regional affiliate URLs.
 * Prefers curated `hrefByRegion`, then displayable catalog rows with brand + SKU match.
 */
export async function resolveKhiterisEditForRegion(
  config: KhiterisEditConfig,
  catalogRegion: string
): Promise<KhiterisEditConfig> {
  const regionChain = catalogRegionFallbackChain(catalogRegion);

  const allCurated = config.products.every((p) => hrefFromCuratedRegions(p, regionChain));
  if (allCurated) {
    return {
      ...config,
      products: config.products.map((product) => ({
        ...product,
        href: resolveProductHref(product, [], regionChain),
      })),
    };
  }

  const sb = supabaseAdmin();
  if (!sb || config.products.length === 0) {
    return {
      ...config,
      products: config.products.map((product) => ({
        ...product,
        href: resolveProductHref(product, [], regionChain),
      })),
    };
  }

  const regionsToFetch = [...new Set([...regionChain, "us", "uk", "eu"])];
  const productNames = [...new Set(config.products.map((p) => p.name.trim()))];

  const { data, error } = await sb
    .from("products")
    .select("name, brand_name, region, url, image_url, is_displayable")
    .in("name", productNames)
    .in("region", regionsToFetch)
    .not("url", "is", null)
    .limit(productNames.length * regionsToFetch.length * 8);

  const rows = !error && data?.length ? (data as CatalogUrlRow[]) : [];

  const products = config.products.map((product) => ({
    ...product,
    href: resolveProductHref(product, rows, regionChain),
  }));

  return { ...config, products };
}
