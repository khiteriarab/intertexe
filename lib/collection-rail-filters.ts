/** Homepage collection rail + membership curation filters (web refresh scripts + docs). */

export const EVENING_PRIORITY_BRAND_SLUGS = [
  "valentino",
  "zimmermann",
  "the-row",
  "saint-laurent",
  "gucci",
  "veronica-beard",
  "loulou-de-la-falaise",
  "roland-mouret",
  "victoria-beckham",
] as const;

export const EVENING_EXCLUDE_BRAND_SLUGS = [
  "tory-burch",
  "camilla",
  "camilla-and-marc",
  "shushu-tong",
  "shushutong",
] as const;

export const VACATION_HOMEPAGE_EXCLUDE_COLORS = [
  "black",
  "navy",
  "dark",
  "charcoal",
  "midnight",
  "forest",
  "khaki",
  "olive",
  "burgundy",
  "grey",
  "gray",
  "heather",
  "anthracite",
  "espresso",
  "chocolate",
  "brown",
  "wine",
  "plum",
  "emerald",
  "cobalt",
  "indigo",
  "slate",
  "gunmetal",
] as const;

export const WHITE_EDIT_TERMS = [
  "white",
  "cream",
  "ivory",
  "ecru",
  "chalk",
  "off-white",
  "off white",
  "snow",
  "pearl",
  "bone",
  "natural",
  "nude",
  "vanilla",
  "oat",
  "milk",
  "porcelain",
] as const;

export function qualifiesForWhiteEditMembership(row: {
  name?: string | null;
  color?: string | null;
  brand_slug?: string | null;
  brandSlug?: string | null;
}): boolean {
  const brand = String(row.brand_slug || row.brandSlug || "").toLowerCase();
  const colorField = String(row.color || "").toLowerCase();
  let name = String(row.name || "").toLowerCase();
  name = name.replace(/\bwhite\s+label\b/g, " ");
  const text = `${name} ${colorField}`;

  const hasWhite =
    WHITE_EDIT_TERMS.some((term) => text.includes(term)) &&
    !/\b(off[\s-]?white\s+brand|off-white\s+brand)\b/i.test(text);
  if (!hasWhite) return false;

  if (brand === "burberry" && /trench|coat|mac/i.test(name)) return false;
  if (brand === "off-white" || brand === "offwhite") {
    if (!WHITE_EDIT_TERMS.some((t) => colorField.includes(t) || name.includes(t))) return false;
  }
  if (/trench|mac coat|raincoat|puffer|down coat|quilted/i.test(name) && !/\bwhite|ivory|cream|ecru|chalk\b/.test(text))
    return false;
  if (/\b(black|navy|charcoal|burgundy|red|green|blue|brown|grey|gray|pink|yellow|orange|purple)\b/.test(colorField))
    return false;
  return true;
}

export function passesVacationHomepageRail(row: { name?: string | null }): boolean {
  const name = String(row.name || "").toLowerCase();
  return !VACATION_HOMEPAGE_EXCLUDE_COLORS.some((color) => name.includes(color));
}

export function eveningBrandBoost(row: {
  brand_slug?: string | null;
  brandSlug?: string | null;
}): number {
  const slug = String(row.brand_slug || row.brandSlug || "").toLowerCase();
  if (EVENING_EXCLUDE_BRAND_SLUGS.some((b) => slug.includes(b.replace(/-/g, "")) || slug === b))
    return -1000;
  const idx = EVENING_PRIORITY_BRAND_SLUGS.findIndex(
    (b) => slug === b || slug.includes(b.replace(/-/g, ""))
  );
  return idx >= 0 ? 1000 - idx * 10 : 0;
}

export function pickSummerInCityHeroImage(products: { name?: string; imageUrl?: string; image_url?: string }[]): string | null {
  const light = ["white", "cream", "sand", "ivory", "light", "stripe", "linen", "ecru", "oat"];
  const types = ["shirt", "blouse", "blazer", "dress"];
  for (const p of products) {
    const name = String(p.name || "").toLowerCase();
    if (!types.some((t) => name.includes(t))) continue;
    if (!light.some((c) => name.includes(c))) continue;
    const url = p.imageUrl || p.image_url;
    if (url && String(url).trim()) return String(url);
  }
  for (const p of products) {
    const url = p.imageUrl || p.image_url;
    if (url && String(url).trim()) return String(url);
  }
  return null;
}
