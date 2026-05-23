import type { Metadata } from "next";
import { fetchDesigners } from "../../../lib/supabase-server";
import { getCuratedScore } from "../../../lib/curated-quality-scores";
import { getCachedBrandStats } from "../../../lib/cached-catalog";
import { formatBrandCountLabel } from "../../../lib/catalog-stats-labels";
import { DesignersAllClient } from "./DesignersAllClient";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const brandStats = await getCachedBrandStats();
  const shoppable = brandStats.filter((b) => b.count >= 2).length;
  const label = formatBrandCountLabel(shoppable);
  return {
    title: "All Brands A-Z — Complete Fashion Brand Directory",
    description: `Browse ${label} fashion brands alphabetically. Filter by quality tier and find brands committed to natural fibers.`,
  };
}

export default async function DesignersAllPage() {
  const allDesigners = await fetchDesigners("", 5000);

  const enriched = allDesigners.map((d) => {
    if (d.naturalFiberPercent != null) return d;
    const score = getCuratedScore(d.name);
    return score != null ? { ...d, naturalFiberPercent: score } : d;
  });

  return (
    <div className="py-6 md:py-12 flex flex-col gap-8 md:gap-12 max-w-6xl mx-auto px-4">
      <DesignersAllClient designers={enriched} />
    </div>
  );
}
