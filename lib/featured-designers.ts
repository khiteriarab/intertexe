import { enrichDesignersWithHeroImages } from "./brand-hero-selection";
import { getBrandHeroImage } from "./brand-hero-images";
import { getServerSupabase } from "./supabase-service-client";

export const FEATURED_BRAND_SLUGS = [
  "the-row",
  "isabel-marant",
  "zimmermann",
  "toteme",
  "faithfull-the-brand",
  "frame",
  "vince",
  "posse",
  "alemais",
  "alc",
  "reformation",
  "brunello-cucinelli",
] as const;

/** DB slug may differ from curated key (e.g. alc → a-l-c-). */
const SLUG_LOOKUP: Record<string, string[]> = {
  alc: ["alc", "a-l-c-", "a-l-c"],
  alemais: ["alemais", "alémais"],
};

export type FeaturedDesignerCard = {
  slug: string;
  name: string;
  heroImageUrl: string | null;
};

type DesignerRow = {
  name: string;
  slug: string;
  hero_image: string | null;
  image_url: string | null;
  natural_fiber_percent: number | null;
  status: string | null;
};

/** Curated 12 brands for /designers — fixed order, hero_image preferred. */
export async function getCuratedFeaturedDesigners(): Promise<FeaturedDesignerCard[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const lookupSlugs = [
    ...new Set([
      ...FEATURED_BRAND_SLUGS,
      ...FEATURED_BRAND_SLUGS.flatMap((s) => SLUG_LOOKUP[s] ?? [s]),
    ]),
  ];

  const { data, error } = await supabase
    .from("designers")
    .select("name, slug, hero_image, image_url, natural_fiber_percent, status")
    .in("slug", lookupSlugs);

  if (error || !data?.length) return [];

  const bySlug = new Map<string, DesignerRow>();
  for (const row of data as DesignerRow[]) {
    bySlug.set(String(row.slug || "").toLowerCase(), row);
  }

  const resolveRow = (key: string): DesignerRow | undefined => {
    const candidates = SLUG_LOOKUP[key] ?? [key];
    for (const s of candidates) {
      const row = bySlug.get(s.toLowerCase());
      if (row) return row;
    }
    return undefined;
  };

  const ordered = FEATURED_BRAND_SLUGS.map((key) => {
    const row = resolveRow(key);
    if (!row) return null;
    const manual =
      (row.hero_image && String(row.hero_image).trim()) ||
      (row.image_url && String(row.image_url).trim()) ||
      null;
    return {
      slug: row.slug,
      name: row.name,
      hero_image: manual,
      heroImage: manual,
      key,
    };
  }).filter(Boolean) as {
    slug: string;
    name: string;
    hero_image: string | null;
    heroImage: string | null;
    key: string;
  }[];

  if (ordered.length === 0) return [];

  const enriched = await enrichDesignersWithHeroImages(supabase, ordered);

  return FEATURED_BRAND_SLUGS.map((key) => {
    const row = enriched.find((e) => e.key === key);
    if (!row) return null;
    const heroImageUrl =
      row.heroImageUrl ||
      row.hero_image ||
      row.heroImage ||
      getBrandHeroImage(row.name);
    return {
      slug: row.slug,
      name: row.name,
      heroImageUrl: heroImageUrl || null,
    };
  }).filter(Boolean) as FeaturedDesignerCard[];
}

/** @deprecated Use getCuratedFeaturedDesigners — kept for any legacy imports. */
export async function getFeaturedDesignersForDirectory(
  _brandStats?: unknown
): Promise<FeaturedDesignerCard[]> {
  return getCuratedFeaturedDesigners();
}
