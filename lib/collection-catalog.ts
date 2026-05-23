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

function isWhiteEditTonal(product: Product): boolean {
  const name = (product.name || "").toLowerCase();
  const cat = (product.category || "").toLowerCase();
  const comp = (product.composition || "").toLowerCase();
  const whiteColor =
    /\b(white|ivory|ecru|cream|chalk|snow|off[- ]?white|optic white|optical white)\b/i;
  if (!whiteColor.test(name) && !whiteColor.test(cat) && !whiteColor.test(comp)) {
    return false;
  }
  const otherColors =
    /\b(black|navy|red|blue|green|pink|burgundy|brown|grey|gray|yellow|orange|purple|floral|print|stripe|striped|dot|dotted|check|plaid|multicolor|multi-color)\b/i;
  if (otherColors.test(name)) {
    const startsWhite = /^(white|ivory|ecru|cream|off[- ]?white)\b/i.test(name.trim());
    if (!startsWhite) return false;
  }
  if (
    /\b(tan|camel|khaki|mustard|gold|beige|sand|taupe|nude|rust|terracotta|olive)\b/.test(name)
  ) {
    return false;
  }
  return true;
}

export function isCollectionEligible(
  product: Product,
  slug: CollectionSlug
): boolean {
  if (!isEditorialWomensApparel(product)) return false;

  const slugs = (product.collectionSlugs || []).map((s) => s.toLowerCase());
  const canonical = COLLECTION_CANONICAL_SLUGS[slug] || [];
  if (canonical.some((c) => slugs.includes(c))) {
    if (slug === "white-edit") return isWhiteEditTonal(product);
    return true;
  }

  if (slug === "white-edit") {
    return collectionEditorialScore(product, slug) > 0 && isWhiteEditTonal(product);
  }

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
