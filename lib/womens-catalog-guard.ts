/**
 * Women's catalog guards — shared by shop, collections, sale, quiz, and ingest parity.
 */

/** Brands that are menswear-only; never surface in women's flows. */
export const MENS_ONLY_BRAND_SLUGS = new Set([
  "orlebar-brown",
  "orlebarbrown",
  "brunello-cucinelli-men",
  "canali",
  "ermenegildo-zegna-mens",
  "hackett",
  "paul-smith-men",
  "ralph-lauren-purple-label-men",
  "tom-ford-men",
]);

/** Title/category signals for menswear — stricter than legacy isNotMensProduct. */
const MENS_TEXT =
  /\b(men'?s|menswear|mens\b|for men\b|male\b|boys?\b|boyfriend\s+fit\b|regular\s+fit\s+men)\b/i;
const WOMENS_OVERRIDE = /\b(women'?s|womens\b|for women\b|ladies\b|female\b)\b/i;
const MENS_GARMENT =
  /\b(dress shirt|oxford shirt|polo\s+shirt|men'?s\s+polo|boxer|briefs|trunks|tie\b|bow tie|cufflinks|tuxedo)\b/i;
const UNISEX_POLO = /\bpolo\s+shirt\b/i;

export function isMensOnlyBrand(slug: string): boolean {
  const s = String(slug || "").trim().toLowerCase();
  if (!s) return false;
  if (MENS_ONLY_BRAND_SLUGS.has(s)) return true;
  if (/\b(mens?|men-only|for-men)\b/.test(s)) return true;
  return false;
}

export function isMensCatalogRow(row: {
  brand_slug?: string;
  brandSlug?: string;
  category?: string;
  name?: string;
  title?: string;
}): boolean {
  const slug = String(row.brand_slug || row.brandSlug || "").toLowerCase();
  if (isMensOnlyBrand(slug)) return true;

  const cat = String(row.category || "").toLowerCase();
  const name = String(row.name || row.title || "").toLowerCase();
  const text = `${cat} ${name}`;

  if (WOMENS_OVERRIDE.test(text)) return false;
  if (MENS_TEXT.test(text)) return true;
  if (MENS_GARMENT.test(text)) return true;
  if (UNISEX_POLO.test(text) && !WOMENS_OVERRIDE.test(text)) return true;

  // The Attico etc. — men's polos / shirts without women's signal
  if (/\b(cotton poplin|poplin)\s+shirt\b/.test(name) && /\bpolo\b/.test(name) && !WOMENS_OVERRIDE.test(text)) {
    return true;
  }

  return false;
}

/** White Edit — require explicit light color in title; not "white" in unrelated tokens. */
export function qualifiesForWhiteEdit(row: {
  name?: string;
  category?: string;
  collection_slugs?: string[] | null;
  collectionSlugs?: string[] | null;
}): boolean {
  const name = String(row.name || "").toLowerCase();
  const cat = String(row.category || "").toLowerCase();
  const slugs = (row.collection_slugs || row.collectionSlugs || []) as string[];

  const hasEditorialSlug = slugs.some((s) => /white-edit|the-white-edit/.test(String(s)));

  const whiteColor =
    /\b(white|ivory|ecru|cream|chalk|snow|off[- ]?white|optic white|optical white)\b/i;
  if (!whiteColor.test(name) && !whiteColor.test(cat)) {
    if (!hasEditorialSlug) return false;
    return false;
  }

  const otherColors =
    /\b(black|navy|red|blue|green|pink|burgundy|brown|grey|gray|yellow|orange|purple|floral|print|stripe|striped|dot|dotted|check|plaid|multicolor|multi-color)\b/i;
  if (otherColors.test(name)) {
    const startsWhite = /^(white|ivory|ecru|cream|off[- ]?white)\b/i.test(name.trim());
    if (!startsWhite) return false;
  }

  return true;
}
