/**
 * Consumer catalog guards — aligned with catalog-rules consumerExclusionReason.
 */
import { consumerExclusionReason } from "./catalog-consumer-rules.js";
import { isSyntheticLeatherProduct } from "./synthetic-leather-guard";
import { isMensCatalogRow } from "./womens-catalog-guard";
import type { Product } from "./supabase-server";

export function isProductUnavailable(stockStatus?: string | null): boolean {
  const status = (stockStatus || "").toLowerCase().trim();
  if (!status) return false;
  return (
    /sold[\s_-]?out/.test(status) ||
    /out[\s_-]?of[\s_-]?stock/.test(status) ||
    status === "unavailable" ||
    status === "discontinued"
  );
}

export function consumerExclusionForProduct(p: {
  name?: string | null;
  category?: string | null;
  composition?: string | null;
  imageUrl?: string | null;
  price?: string | null;
  url?: string | null;
  brandSlug?: string | null;
  stockStatus?: string | null;
}): string | null {
  if (isProductUnavailable(p.stockStatus)) {
    return "unavailable";
  }
  if (!p.composition || !String(p.composition).trim()) {
    return "missing_composition";
  }
  if (isSyntheticLeatherProduct({ name: p.name, composition: p.composition })) {
    return "synthetic_leather";
  }
  if (
    isMensCatalogRow({
      name: p.name ?? undefined,
      category: p.category ?? undefined,
      brand_slug: p.brandSlug ?? undefined,
      url: p.url ?? undefined,
    })
  ) {
    return "mens";
  }
  return consumerExclusionReason({
    name: p.name ?? "",
    category: p.category ?? "",
    composition: p.composition ?? "",
    imageUrl: p.imageUrl ?? "",
    price: p.price ?? "",
    url: p.url ?? "",
  });
}

export function consumerExclusionForRow(row: Record<string, unknown>): string | null {
  if (isProductUnavailable(row.stock_status != null ? String(row.stock_status) : null)) {
    return "unavailable";
  }
  return consumerExclusionReason({
    name: String(row.name ?? row.title ?? ""),
    category: String(row.category ?? ""),
    composition: String(row.composition ?? ""),
    image_url: String(row.image_url ?? ""),
    price: String(row.price ?? ""),
    url: String(row.url ?? ""),
  });
}

export function filterConsumerCatalogProducts<T extends Product>(products: T[]): T[] {
  return products.filter((p) => !consumerExclusionForProduct(p));
}
