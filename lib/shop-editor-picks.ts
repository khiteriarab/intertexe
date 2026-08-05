/**
 * Curator account favorites (`is_editor_pick`) lead Shop clothing on newest / recommended.
 * Trigger: product_favorites for khiteriarab@gmail.com → products.is_editor_pick.
 * Browse v2 currently sorts by created_at only — this restores the curation lead.
 */
import { canonicalProductId } from "./canonical-product-id";
import type { DirectCatalogProduct } from "./catalog-direct-query";
import { fetchEditorPickProducts } from "./homepage-rails-personalize";
import type { Product } from "./supabase-server";

function productKeys(product: { id?: string; productId?: string }): string[] {
  return [
    canonicalProductId(product as { id?: string; productId?: string }),
    String(product.productId || ""),
    String(product.id || ""),
  ].filter(Boolean);
}

function toShopProduct(p: Product): DirectCatalogProduct {
  return {
    id: String(p.id ?? ""),
    brandSlug: String(p.brandSlug ?? ""),
    brandName: String(p.brandName ?? ""),
    name: String(p.name ?? ""),
    productId: String(p.productId ?? p.id ?? ""),
    url: String(p.url ?? ""),
    imageUrl: String(p.imageUrl ?? ""),
    price: String(p.price ?? ""),
    composition: String(p.composition ?? ""),
    naturalFiberPercent: Number(p.naturalFiberPercent ?? 0),
    category: String(p.category ?? ""),
    matchingSetId: p.matchingSetId != null ? String(p.matchingSetId) : null,
    isSale: Boolean(p.isSale),
    originalPrice: p.originalPrice != null ? String(p.originalPrice) : null,
    listingRegion: p.listingRegion != null ? String(p.listingRegion) : null,
    stockStatus: p.stockStatus != null ? String(p.stockStatus) : null,
    isEditorPick: true,
    editorPickedAt: p.editorPickedAt != null ? String(p.editorPickedAt) : null,
  };
}

function isFootwear(p: DirectCatalogProduct | Product): boolean {
  const hay = `${p.category || ""} ${p.name || ""}`.toLowerCase();
  return /\b(shoe|shoes|footwear|sandal|boot|sneaker|heel|pump|loafer|mule)\b/.test(hay);
}

/**
 * Put curator favorites first, then the browse page — for default clothing / newest.
 */
export async function leadShopWithEditorPicks(
  base: DirectCatalogProduct[],
  limit: number
): Promise<DirectCatalogProduct[]> {
  const lim = Math.min(Math.max(limit, 1), 48);
  let picks: DirectCatalogProduct[] = [];
  try {
    const raw = await fetchEditorPickProducts(lim);
    picks = raw
      .filter((p) => !isFootwear(p) && Boolean(String(p.imageUrl || "").trim()))
      .map(toShopProduct);
  } catch {
    picks = [];
  }

  if (!picks.length) return base.slice(0, lim);

  const seen = new Set<string>();
  const out: DirectCatalogProduct[] = [];

  const append = (product: DirectCatalogProduct) => {
    const keys = productKeys(product);
    if (!keys.length || keys.some((k) => seen.has(k))) return;
    for (const k of keys) seen.add(k);
    out.push(product);
  };

  for (const p of picks) {
    append(p);
    if (out.length >= lim) return out;
  }
  for (const p of base) {
    if (isFootwear(p)) continue;
    append(p);
    if (out.length >= lim) return out;
  }
  return out;
}

export function shouldLeadShopWithEditorPicks(opts: {
  sort?: string;
  offset?: number;
  fiber?: string;
  category?: string;
  categories?: string[];
  brand?: string;
  search?: string;
  color?: string;
  materialSubtype?: string;
  fabricConstruction?: string;
  minPrice?: number;
  maxPrice?: number;
}): boolean {
  const sort = (opts.sort || "new").toLowerCase();
  const newest =
    !sort ||
    sort === "new" ||
    sort === "newest" ||
    sort === "recommended";
  if (!newest) return false;
  if ((opts.offset ?? 0) > 0) return false;
  if (opts.fiber && opts.fiber !== "all") return false;
  if (opts.category && opts.category !== "all" && opts.category !== "clothing" && opts.category !== "apparel")
    return false;
  if (opts.categories?.some((c) => c && c !== "all" && c !== "clothing" && c !== "apparel"))
    return false;
  if (opts.brand?.trim()) return false;
  if (opts.search?.trim()) return false;
  if (opts.color?.trim()) return false;
  if (opts.materialSubtype?.trim()) return false;
  if (opts.fabricConstruction?.trim()) return false;
  if (opts.minPrice != null && opts.minPrice > 0) return false;
  if (opts.maxPrice != null && opts.maxPrice > 0) return false;
  return true;
}
