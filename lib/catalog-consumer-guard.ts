/**
 * Consumer catalog guards — aligned with catalog-rules consumerExclusionReason.
 */
import { consumerExclusionReason } from "./catalog-rules";
import type { Product } from "./supabase-server";

export function consumerExclusionForProduct(p: {
  name?: string | null;
  category?: string | null;
  composition?: string | null;
  imageUrl?: string | null;
  price?: string | null;
  url?: string | null;
}): string | null {
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
