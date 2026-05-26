/**
 * Editorial collection worlds — shared copy + relevance scoring (web + Supabase rail curation).
 */
import type { CollectionSlug } from "./collection-pages";

export type CollectionEditorial = {
  slug: CollectionSlug;
  themes: string[];
  /** Boost when name/category/composition matches these patterns */
  patterns: RegExp[];
  /** Penalize obvious mismatches */
  exclude?: RegExp[];
};

/** Product.collection_slugs that auto-qualify for a collection page */
export const COLLECTION_CANONICAL_SLUGS: Record<CollectionSlug, string[]> = {
  vacation: ["vacation-shop", "vacation-edit"],
  evening: ["evening-edit", "evening"],
  tailoring: ["tailoring-edit", "tailoring"],
  "summer-in-the-city": ["city-wardrobe", "summer-in-the-city"],
  "white-edit": ["white-edit", "the-white-edit"],
};

export const COLLECTION_EDITORIAL: Record<CollectionSlug, CollectionEditorial> = {
  vacation: {
    slug: "vacation",
    themes: [
      "Mediterranean luxury",
      "resort dressing",
      "linen movement",
      "silk at sunset",
      "woven textures",
      "raffia accessories",
      "beach dinners",
      "warm neutrals",
      "white cotton",
      "destination energy",
      "Ibiza",
      "Amalfi",
      "Hydra",
      "St. Barths",
    ],
    patterns: [
      /linen|flax|raffia|resort|vacation|beach|summer|swim|bikini|kaftan|caftan|sundress|cover[- ]?up|coverup|midi dress|maxi dress|mini dress|dress|skirt|short|top|blouse|tank|woven|sand|ecru|ivory|cream|stone|oatmeal|silk|cotton|tote|espadrille|sandal|raffia/i,
    ],
    exclude: [/blazer|suit jacket|sport coat|wool trouser|evening gown|cocktail dress|ski|down coat|puffer/i],
  },
  evening: {
    slug: "evening",
    themes: [
      "elevated night dressing",
      "silk draping",
      "black tailoring",
      "deep jewel tones",
      "satin",
      "structured elegance",
      "minimal glamour",
      "candlelit dinner",
      "heels",
      "clutches",
      "fluid silhouettes",
      "cinematic luxury",
    ],
    patterns: [
      /evening|cocktail|gown|satin|silk|dress|jewel|burgundy|plum|emerald|navy|black/i,
    ],
    exclude: [
      /\b(shirt|tee|t-?shirt|polo|sweatshirt|hoodie|jogger|sweatpant|sweat pant|tank|vest|casual)\b/i,
      /jogger|sweat|tee|beach|resort|linen short|poplin shirt|cotton poplin/i,
    ],
  },
  tailoring: {
    slug: "tailoring",
    themes: [
      "sharp structure",
      "relaxed luxury suiting",
      "oversized blazers",
      "wool trousers",
      "monochrome styling",
      "quiet luxury",
      "strong silhouette",
      "masculine",
      "feminine tension",
      "refined minimalism",
      "investment dressing",
    ],
    patterns: [
      /blazer|jacket|coat|trouser|pant|suit|tailor|structured|wool|crepe|pinstripe/i,
    ],
    exclude: [/swim|bikini|beach|resort|men'?s|mens\b|male|boyfriend\s+fit/i],
  },
  "summer-in-the-city": {
    slug: "summer-in-the-city",
    themes: [
      "urban summer dressing",
      "lightweight tailoring",
      "cotton poplin",
      "polished daytime",
      "city movement",
      "neutrals",
      "black",
      "white",
      "elevated basics",
      "rooftop",
      "chic practicality",
      "downtown luxury",
    ],
    patterns: [
      /shirt|blouse|trouser|pant|dress|jacket|blazer|poplin|cotton|linen|city|day/i,
    ],
    exclude: [/evening gown|cocktail|beach|resort|ski/i],
  },
  "white-edit": {
    slug: "white-edit",
    themes: [
      "tonal dressing",
      "whites",
      "creams",
      "ivory",
      "stone",
      "purity",
      "softness",
      "summer elegance",
      "minimal styling",
      "airy fabrics",
      "luxury simplicity",
      "visual calm",
      "editorial restraint",
      "expensive minimalism",
    ],
    patterns: [
      /\bwhite\b|\bivory\b|\bcream\b|\boff[- ]?white\b|\bchalk\b|\bpearl\b|\bsnow\b/i,
    ],
    exclude: [
      /black dress|navy|burgundy|print|floral/i,
      /\b(tan|camel|khaki|yellow|mustard|gold|brown|beige|sand|taupe|nude|rust|terracotta|olive|orange)\b/i,
    ],
  },
};

export function collectionEditorialScore(
  product: {
    name?: string | null;
    category?: string | null;
    composition?: string | null;
    naturalFiberPercent?: number | null;
  },
  slug: CollectionSlug
): number {
  const ed = COLLECTION_EDITORIAL[slug];
  const text = `${product.name || ""} ${product.category || ""} ${product.composition || ""}`.toLowerCase();
  if (ed.exclude?.some((re) => re.test(text))) return -100;

  const canonical = COLLECTION_CANONICAL_SLUGS[slug];
  const slugs = ((product as { collectionSlugs?: string[] }).collectionSlugs || []).map((s) =>
    s.toLowerCase()
  );
  if (canonical.some((c) => slugs.includes(c))) return 200;

  let score = 0;
  for (const re of ed.patterns) {
    if (re.test(text)) score += 12;
  }
  const nfp = product.naturalFiberPercent ?? 0;
  if (nfp >= 90) score += 4;
  if (nfp >= 80) score += 2;
  return score;
}

export function rankForCollection<T extends { name?: string | null; category?: string | null; composition?: string | null; naturalFiberPercent?: number | null }>(
  products: T[],
  slug: CollectionSlug
): T[] {
  return [...products]
    .map((p) => ({ p, score: collectionEditorialScore(p, slug) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
