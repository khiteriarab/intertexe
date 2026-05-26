import type { Product } from "./supabase-server";

/** Homepage sale rail — luxury floor; approved brands only; highest price first. */
export const HOMEPAGE_SALE_MIN_PRICE = 200;

/** Approved brands for homepage sale preview (full /sale page is unfiltered). */
export const HOMEPAGE_SALE_APPROVED_BRAND_SLUGS = [
  "a-l-c",
  "alc",
  "isabel-marant",
  "faithfull",
  "faithfull-the-brand",
  "lafayette-148",
  "re-done",
  "reformation",
  "zimmermann",
  "vince",
  "theory",
  "frame",
  "veronica-beard",
  "rixo",
  "sea",
  "sea-new-york",
  "camilla",
  "staud",
  "posse",
  "sir",
  "alemais",
  "nili-lotan",
  "eres",
  "loewe",
  "gucci",
  "valentino",
  "prada",
  "the-row",
  "saint-laurent",
  "miu-miu",
  "rodarte",
  "etro",
  "pucci",
  "rabanne",
  "jw-anderson",
  "acne-studios",
  "toteme",
  "ganni",
] as const;

const APPROVED_BRAND_NAMES: Record<string, string> = {
  alc: "alc",
  "a-l-c": "a.l.c",
  alemais: "alémais",
  "faithfull-the-brand": "faithfull the brand",
  "re-done": "re/done",
  "lafayette-148": "lafayette 148",
  "sea-new-york": "sea new york",
  "nili-lotan": "nili lotan",
  "jw-anderson": "jw anderson",
  "acne-studios": "acne studios",
  "isabel-marant": "isabel marant",
  "veronica-beard": "veronica beard",
  "the-row": "the row",
  "saint-laurent": "saint laurent",
  "miu-miu": "miu miu",
};

function parsePrice(price: string | null | undefined): number {
  if (!price) return 0;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function isApprovedSaleBrand(product: Product): boolean {
  const slug = (product.brandSlug || "").toLowerCase();
  const name = (product.brandName || "").toLowerCase();

  return HOMEPAGE_SALE_APPROVED_BRAND_SLUGS.some((approved) => {
    if (slug === approved || slug.startsWith(`${approved}-`) || slug.includes(approved)) {
      return true;
    }
    const label = APPROVED_BRAND_NAMES[approved] || approved.replace(/-/g, " ");
    return name.includes(label) || name.replace(/\s+/g, "-").includes(approved);
  });
}

/** Homepage sale rail — $200+ approved brands, sorted by price descending. */
export function filterHomepageSaleProducts(products: Product[], limit = 8): Product[] {
  return products
    .filter((p) => parsePrice(p.price) >= HOMEPAGE_SALE_MIN_PRICE)
    .filter(isApprovedSaleBrand)
    .sort((a, b) => parsePrice(b.price) - parsePrice(a.price))
    .slice(0, limit);
}
