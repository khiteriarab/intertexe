import type { Metadata } from "next";
import { fetchDesigners } from "@/../../lib/supabase-server";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { DesignersAllClient } from "./DesignersAllClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All Brands A-Z — Complete Fashion Brand Directory",
  description: "Browse our complete database of 11,000+ fashion brands alphabetically. Filter by quality tier and find brands committed to natural fibers.",
};

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
