/**
 * Collection membership sort order — prestige / price ranking for Supabase memberships.
 */
import type { CollectionSlug } from "./collection-pages";
import { collectionEditorialScore } from "./collection-editorial";
import type { Product } from "./supabase-server";

/** White Edit — priority brands surface first (dresses & editorial over mall tees). */
export const WHITE_EDIT_PRIORITY_BRAND_SLUGS = [
  "faithfull-the-brand",
  "faithfull",
  "zimmermann",
  "posse",
  "the-row",
  "isabel-marant",
  "alc",
  "a-l-c",
  "a-l-c-",
  "sir",
  "alemais",
  "rixo",
  "nili-lotan",
  "reformation",
] as const;

/** Evening — luxury houses open the collection; sort by prestige tier then price. */
export const EVENING_PRESTIGE_BRAND_SLUGS = [
  "valentino",
  "prada",
  "zimmermann",
  "rodarte",
  "oscar-de-la-renta",
  "loewe",
  "gucci",
  "saint-laurent",
  "the-row",
  "miu-miu",
] as const;

export function parseCollectionPrice(price: string | null | undefined): number {
  if (!price) return 0;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function brandSlugMatches(slug: string, name: string, keys: readonly string[]): number {
  const s = slug.toLowerCase();
  const n = name.toLowerCase();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    if (s === key || s.startsWith(`${key}-`) || s.includes(key)) return keys.length - i;
    const spaced = key.replace(/-/g, " ");
    if (n.includes(spaced) || n.includes(key.replace(/-/g, ""))) return keys.length - i;
  }
  return 0;
}

export function whiteEditBrandPriorityScore(product: Product): number {
  const slug = (product.brandSlug || "").toLowerCase();
  const name = (product.brandName || "").toLowerCase();
  const productName = (product.name || "").toLowerCase();
  const tier = brandSlugMatches(slug, name, WHITE_EDIT_PRIORITY_BRAND_SLUGS);
  let score = tier * 10_000;
  if (tier > 0) score += collectionEditorialScore(product, "white-edit");
  // Dresses & gowns before basic tees within non-priority tail
  if (/dress|gown|midi|maxi/i.test(productName)) score += 200;
  if (/\b(tee|t-?shirt)\b/i.test(productName)) score -= 300;
  if (tier === 0) score += collectionEditorialScore(product, "white-edit") * 0.1;
  return score;
}

export function eveningCollectionRankScore(product: Product): number {
  const slug = (product.brandSlug || "").toLowerCase();
  const name = (product.brandName || "").toLowerCase();
  const price = parseCollectionPrice(product.price);
  const prestigeTier = brandSlugMatches(slug, name, EVENING_PRESTIGE_BRAND_SLUGS);
  // Prestige tier dominates; within tier, highest price first
  return prestigeTier * 10_000_000 + price * 100 + collectionEditorialScore(product, "evening");
}

/** Round-robin across brands so one label cannot monopolize the first page. */
function interleaveWhiteEditProducts<T extends Product>(products: T[]): T[] {
  const scored = [...products].sort(
    (a, b) => whiteEditBrandPriorityScore(b) - whiteEditBrandPriorityScore(a)
  );

  const byBrand = new Map<string, T[]>();
  for (const product of scored) {
    const brand = (product.brandSlug || product.brandName || "unknown").toLowerCase();
    const queue = byBrand.get(brand);
    if (queue) queue.push(product);
    else byBrand.set(brand, [product]);
  }

  const brandOrder = [...byBrand.entries()]
    .sort(
      (a, b) =>
        whiteEditBrandPriorityScore(b[1][0]!) - whiteEditBrandPriorityScore(a[1][0]!)
    )
    .map(([brand]) => brand);

  const result: T[] = [];
  let round = 0;
  while (result.length < scored.length) {
    let added = false;
    for (const brand of brandOrder) {
      const queue = byBrand.get(brand)!;
      if (round < queue.length) {
        result.push(queue[round]!);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return result;
}

export function sortProductsForCollection<T extends Product>(
  products: T[],
  slug: CollectionSlug
): T[] {
  if (slug === "white-edit") {
    return interleaveWhiteEditProducts(products);
  }
  if (slug === "evening") {
    return [...products].sort(
      (a, b) => eveningCollectionRankScore(b) - eveningCollectionRankScore(a)
    );
  }
  return [...products]
    .map((p) => ({ p, score: collectionEditorialScore(p, slug) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
