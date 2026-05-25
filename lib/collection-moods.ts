import type { CollectionSlug } from "./collection-pages";
import type { Product } from "./supabase-server";
import { pickBestEditorialImage, scoreImageForEditorial } from "./editorial-image-score";

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

const moodColorPreferences: Record<
  string,
  { include: string[]; exclude: string[] }
> = {
  "Coastal Elegance": {
    include: ["white", "cream", "sand", "ivory", "natural", "linen"],
    exclude: ["black", "navy", "dark", "midnight"],
  },
  "Pool to Dinner": {
    include: ["terracotta", "coral", "orange", "rust", "warm", "amber"],
    exclude: ["black", "navy", "dark"],
  },
  "Air & Drape": {
    include: ["linen", "natural", "beige", "sand", "white", "cream"],
    exclude: ["black", "dark", "navy"],
  },
  "Woven Textures": {
    include: ["woven", "texture", "natural", "cotton", "tan", "ecru"],
    exclude: [],
  },
  "Raffia & Natural": {
    include: ["raffia", "natural", "tan", "nude", "sand", "straw"],
    exclude: ["black", "dark"],
  },
  "Beach Dinners": {
    include: ["silk", "evening", "warm", "golden", "champagne", "bronze"],
    exclude: [],
  },
  "Warm Neutrals": {
    include: ["camel", "beige", "cream", "sand", "stone", "neutral", "warm"],
    exclude: ["black", "dark", "navy"],
  },
  "Tactile Craft": {
    include: ["woven", "texture", "natural", "cotton", "tan", "ecru"],
    exclude: [],
  },
  "Natural Carry": {
    include: ["raffia", "natural", "tan", "nude", "sand", "straw"],
    exclude: ["black", "dark"],
  },
  "After Sand": {
    include: ["silk", "evening", "warm", "golden", "champagne", "bronze"],
    exclude: [],
  },
  "Sand & Stone": {
    include: ["camel", "beige", "cream", "sand", "stone", "neutral", "warm"],
    exclude: ["black", "dark", "navy"],
  },
};

function moodNameMatchesColorPrefs(
  name: string,
  prefs: { include: string[]; exclude: string[] }
): boolean {
  const n = name.toLowerCase();
  const hasInclude =
    prefs.include.length === 0 || prefs.include.some((t) => n.includes(t));
  const hasExclude = prefs.exclude.some((t) => n.includes(t));
  return hasInclude && !hasExclude;
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
  const colorPrefs = moodColorPreferences[moodLabel] || { include: [], exclude: [] };

  const pool = products.filter((p) => {
    if (!p.imageUrl || usedImages.has(p.imageUrl)) return false;
    const text = `${p.name || ""} ${p.composition || ""}`.toLowerCase();
    const keywordOk =
      keywords.length === 0 || keywords.some((kw) => text.includes(kw.toLowerCase()));
    if (!keywordOk) return false;
    return moodNameMatchesColorPrefs(p.name || "", colorPrefs);
  });

  const ranked = [...pool].sort(
    (a, b) =>
      scoreImageForEditorial(b.imageUrl || "", b.name || "") -
      scoreImageForEditorial(a.imageUrl || "", a.name || "")
  );

  const best = pickBestEditorialImage(ranked, { preferFullLength: true });
  if (best) {
    usedImages.add(best);
    return best;
  }

  const relaxed = products.filter((p) => p.imageUrl && !usedImages.has(p.imageUrl));
  const fallbackPick = pickBestEditorialImage(relaxed, { preferFullLength: true });
  if (fallbackPick) {
    usedImages.add(fallbackPick);
    return fallbackPick;
  }

  if (fallbackUrl && !usedImages.has(fallbackUrl)) {
    usedImages.add(fallbackUrl);
    return fallbackUrl;
  }

  return undefined;
}
