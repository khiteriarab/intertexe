import type { BrandStat } from "./cached-catalog";
import { enrichDesignersWithHeroImages } from "./brand-hero-selection";
import { fetchDesignersBySlugs } from "./supabase-server";
import { getServerSupabase } from "./supabase-service-client";

export const FEATURED_DESIGNER_COUNT = 12;

export type FeaturedDesignerCard = {
  slug: string;
  name: string;
  heroImageUrl: string | null;
  productCount: number;
};

/** Top inventory brands for the designers page editorial grid. */
export async function getFeaturedDesignersForDirectory(
  brandStats: BrandStat[]
): Promise<FeaturedDesignerCard[]> {
  const top = [...brandStats]
    .filter((b) => b.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, FEATURED_DESIGNER_COUNT);

  if (top.length === 0) return [];

  const slugs = top.map((b) => b.slug);
  const designers = await fetchDesignersBySlugs(slugs);
  const supabase = getServerSupabase();
  const inputs = top.map((b) => {
    const d = designers.find((x) => x.slug === b.slug);
    return {
      slug: b.slug,
      name: d?.name || b.name,
      hero_image: d?.heroImage ?? null,
    };
  });

  const enriched =
    supabase != null
      ? await enrichDesignersWithHeroImages(supabase, inputs)
      : inputs.map((i) => ({ ...i, heroImageUrl: null as string | null }));

  return top.map((b) => {
    const row = enriched.find((e) => e.slug === b.slug);
    return {
      slug: b.slug,
      name: row?.name || b.name,
      heroImageUrl: row?.heroImageUrl ?? null,
      productCount: b.count,
    };
  });
}
