/**
 * Full collection catalog (paginated) — separate from capped homepage merch rails.
 */
import type { CollectionSlug } from "./collection-pages";
import {
  collectionEditorialScore,
  rankForCollection,
  COLLECTION_CANONICAL_SLUGS,
} from "./collection-editorial";
import { isEditorialWomensApparel } from "./catalog-product-filters";
import type { Product } from "./supabase-server";

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
  "summer-in-the-city": [
    { fiber: "cotton" },
    { fiber: "linen" },
    { category: "dresses", fiber: "cotton" },
    { search: "poplin" },
    { category: "outerwear", fiber: "linen" },
  ],
  "white-edit": [
    { search: "white" },
    { search: "ivory" },
    { search: "cream" },
    { search: "ecru" },
    { fiber: "linen", category: "dresses" },
    { fiber: "cotton", category: "dresses" },
    { fiber: "linen" },
    { fiber: "cotton" },
  ],
};

export function isCollectionEligible(
  product: Product,
  slug: CollectionSlug
): boolean {
  if (!isEditorialWomensApparel(product)) return false;

  const slugs = (product.collectionSlugs || []).map((s) => s.toLowerCase());
  const canonical = COLLECTION_CANONICAL_SLUGS[slug] || [];
  if (canonical.some((c) => slugs.includes(c))) return true;

  return collectionEditorialScore(product, slug) > 0;
}

export function buildRankedCollectionCatalog(
  products: Product[],
  slug: CollectionSlug
): Product[] {
  const eligible = products.filter((p) => isCollectionEligible(p, slug));
  return rankForCollection(eligible, slug);
}

export function paginateCollectionCatalog(
  ranked: Product[],
  limit: number,
  offset: number
): Product[] {
  return ranked.slice(offset, offset + limit);
}
