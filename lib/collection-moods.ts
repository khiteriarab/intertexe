import type { CollectionSlug } from "./collection-pages";
import type { Product } from "./supabase-server";

export type CollectionMoodDef = {
  keywords: string[];
  categories: string[];
};

/** Editorial mood filters per collection (display label → match rules). */
export const COLLECTION_MOODS: Partial<
  Record<CollectionSlug, Record<string, CollectionMoodDef>>
> = {
  vacation: {
    "Coastal Elegance": {
      keywords: ["silk", "linen", "white", "cream"],
      categories: ["dresses", "swimwear"],
    },
    "Pool to Dinner": {
      keywords: ["resort", "kaftan", "maxi"],
      categories: ["dresses", "tops"],
    },
    "Air & Drape": {
      keywords: ["linen", "loose", "drape"],
      categories: ["dresses", "tops", "trousers"],
    },
    "Woven Textures": {
      keywords: ["cotton", "woven", "texture"],
      categories: ["tops", "skirts"],
    },
    "Raffia & Natural": {
      keywords: ["raffia", "natural", "woven"],
      categories: ["accessories"],
    },
    "Beach Dinners": {
      keywords: ["silk", "evening", "maxi"],
      categories: ["dresses"],
    },
    "Warm Neutrals": {
      keywords: ["camel", "beige", "cream", "sand"],
      categories: [],
    },
  },
};

export function collectionMoodLabels(slug: CollectionSlug): string[] {
  return Object.keys(COLLECTION_MOODS[slug] || {});
}

export function productMatchesCollectionMood(
  product: Pick<Product, "name" | "composition" | "category">,
  moodLabel: string,
  collectionSlug: CollectionSlug
): boolean {
  const def = COLLECTION_MOODS[collectionSlug]?.[moodLabel];
  if (!def) return true;
  const text = `${product.name || ""} ${product.composition || ""}`.toLowerCase();
  const keywordHit = def.keywords.some((kw) => text.includes(kw.toLowerCase()));
  if (keywordHit) return true;
  if (!def.categories.length) return false;
  const cat = `${product.category || ""} ${product.name || ""}`.toLowerCase();
  return def.categories.some((c) => cat.includes(c.toLowerCase()));
}

export function filterProductsByCollectionMood(
  products: Product[],
  moodLabel: string | null,
  collectionSlug: CollectionSlug
): Product[] {
  if (!moodLabel) return products;
  return products.filter((p) => productMatchesCollectionMood(p, moodLabel, collectionSlug));
}

/** Unique hero image per mood from catalog products (editorial rail). */
export function getMoodHeroImage(
  moodLabel: string,
  products: Product[],
  collectionSlug: CollectionSlug,
  usedImages: Set<string>,
  fallbackUrl?: string
): string | undefined {
  const def = COLLECTION_MOODS[collectionSlug]?.[moodLabel];
  const keywords = def?.keywords ?? [];
  const matching = products.find((p) => {
    if (!p.imageUrl || usedImages.has(p.imageUrl)) return false;
    const text = `${p.name || ""} ${p.composition || ""}`.toLowerCase();
    return keywords.length === 0 || keywords.some((kw) => text.includes(kw.toLowerCase()));
  });
  if (matching?.imageUrl) {
    usedImages.add(matching.imageUrl);
    return matching.imageUrl;
  }
  if (fallbackUrl && !usedImages.has(fallbackUrl)) {
    usedImages.add(fallbackUrl);
    return fallbackUrl;
  }
  return matching?.imageUrl || fallbackUrl;
}
