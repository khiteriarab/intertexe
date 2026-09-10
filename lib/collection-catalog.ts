/**
 * Full collection catalog (paginated) — separate from capped homepage merch rails.
 */
import type { CollectionSlug } from "./collection-pages";
import {
  collectionEditorialScore,
  COLLECTION_CANONICAL_SLUGS,
} from "./collection-editorial";
import { sortProductsForCollection } from "./collection-sort";
import { isEditorialWomensApparel } from "./catalog-product-filters";
import type { Product } from "./supabase-server";
import { catalogDedupeKey } from "./catalog-rules";

export type CollectionCatalogQuery = {
  fiber?: string;
  category?: string;
  search?: string;
};

/** Parallel catalog_list sources per editorial world (deduped + ranked). */
export const COLLECTION_CATALOG_QUERIES: Record<CollectionSlug, CollectionCatalogQuery[]> = {
  vacation: [
    { fiber: "linen", category: "dresses" },
    { fiber: "linen", category: "skirts" },
    { fiber: "cotton", category: "dresses" },
    { fiber: "cotton", category: "skirts" },
    { fiber: "silk", category: "dresses" },
    { fiber: "linen" },
    { fiber: "cotton" },
    { fiber: "silk" },
  ],
  evening: [
    { fiber: "silk", category: "dresses" },
    { fiber: "silk" },
    { search: "evening" },
    { search: "cocktail" },
    { category: "dresses", search: "satin" },
  ],
  tailoring: [
    { fiber: "wool", category: "outerwear" },
    { fiber: "wool" },
    { search: "blazer" },
    { search: "trouser" },
    { category: "outerwear" },
  ],
  "fall-edit": [
    { fiber: "cashmere" },
    { fiber: "cashmere", category: "outerwear" },
    { search: "suede" },
    { search: "cashmere knit" },
    { fiber: "wool", category: "outerwear" },
  ],
  "leather-edit": [
    { search: "leather" },
    { search: "suede" },
    { search: "shearling" },
    { category: "outerwear", search: "leather" },
    { category: "outerwear", search: "suede" },
    { search: "leather jacket" },
    { search: "leather skirt" },
  ],
};

function isLeatherEditProduct(product: Product): boolean {
  const text = `${product.name || ""} ${product.category || ""} ${product.composition || ""}`.toLowerCase();
  return /leather|suede|nappa|lambskin|shearling|calfskin/.test(text);
}

export function isCollectionEligible(
  product: Product,
  slug: CollectionSlug
): boolean {
  if (!isEditorialWomensApparel(product)) return false;

  const slugs = (product.collectionSlugs || []).map((s) => s.toLowerCase());
  const canonical = COLLECTION_CANONICAL_SLUGS[slug] || [];
  if (canonical.some((c) => slugs.includes(c))) {
    if (slug === "leather-edit") return isLeatherEditProduct(product);
    if (slug === "evening") return collectionEditorialScore(product, slug) > 0;
    return true;
  }

  if (slug === "leather-edit") {
    return collectionEditorialScore(product, slug) > 0 && isLeatherEditProduct(product);
  }

  return collectionEditorialScore(product, slug) > 0;
}

export function buildRankedCollectionCatalog(
  products: Product[],
  slug: CollectionSlug
): Product[] {
  const eligible = products.filter((p) => isCollectionEligible(p, slug));
  return sortProductsForCollection(eligible, slug);
}

export function paginateCollectionCatalog(
  ranked: Product[],
  limit: number,
  offset: number
): Product[] {
  return ranked.slice(offset, offset + limit);
}
