import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners } from "@/lib/supabase";
import { getQualityTier, getTierColor, type QualityTier } from "@/lib/quality-tiers";
import { filterToCuratedBrands } from "@/lib/curated-brands";
import { BrandImage } from "@/components/BrandImage";

const FILTER_TABS = [
  { key: 'all', label: 'All Picks' },
  { key: 'exceptional', label: 'Exceptional' },
  { key: 'excellent', label: 'Excellent' },
] as const;

export default function JustIn() {
  const [filter, setFilter] = useState<string>('all');

  const { data: designers = [], isLoading } = useQuery({
    queryKey: ["designers-edit"],
    queryFn: () => fetchDesigners(undefined, 200),
    staleTime: 5 * 60 * 1000,
  });

  const scoredDesigners = (designers as any[])
    .filter((d: any) => d.naturalFiberPercent != null && d.naturalFiberPercent >= 70)
    .sort((a: any, b: any) => (b.naturalFiberPercent ?? 0) - (a.naturalFiberPercent ?? 0));

  const qualityDesigners = scoredDesigners.length > 0
    ? scoredDesigners
    : filterToCuratedBrands(designers as any[]);

  const filtered = filter === 'all'
    ? qualityDesigners
    : qualityDesigners.filter((d: any) => {
        const tier = getQualityTier(d.naturalFiberPercent);
        return tier.tier === filter;
      });

  const featured = filtered[0];
  const grid = filtered.slice(1, 13);
  const remaining = filtered.slice(13);

  return (
    <div className="py-6 md:py-12 flex flex-col gap-10 md:gap-14">
      <header className="flex flex-col gap-3 md:gap-5">
        <div className="flex items-center gap-3">
          <Award className="w-4 h-4 md:w-5 md:h-5 text-foreground/60" />
          <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Curated by INTERTEXE</span>
        </div>
        <h1 className="text-3xl md:text-6xl font-serif" data-testid="text-edit-title">The Edit</h1>
        <p className="text-muted-foreground max-w-xl text-sm md:text-base">
          Our curated selection of designers who meet the INTERTEXE standard. Every brand here has been vetted for material quality — you just shop.
        </p>
      </header>

      <div className="flex gap-2 md:gap-3 border-b border-border/40 pb-0">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 md:px-5 py-2.5 md:py-3 text-[10px] md:text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              filter === tab.key
                ? 'border-foreground text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            data-testid={`tab-filter-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-12 animate-pulse">
          <div className="h-[400px] bg-secondary" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="flex flex-col gap-4">
                <div className="aspect-[3/4] bg-secondary" />
                <div className="h-5 bg-secondary w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          No designers match this filter.
        </div>
      ) : (
        <>
          {featured && (
            <Link href={`/designers/${featured.slug}`} className="group active:scale-[0.99] transition-transform" data-testid={`card-featured-${featured.slug}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-0 border border-border/40 group-hover:border-foreground/20 transition-colors">
                <div className="aspect-[16/9] md:aspect-auto bg-secondary relative overflow-hidden">
                  <BrandImage name={featured.name} className="w-full h-full min-h-[200px] md:min-h-[300px]" />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-medium ${getTierColor(getQualityTier(featured.naturalFiberPercent).tier)}`}>
                      {getQualityTier(featured.naturalFiberPercent).verdict}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-4 md:gap-6 p-5 md:p-12">
                  <div className="flex items-center gap-3">
                    <span className="bg-foreground text-background px-3 py-1 text-[10px] uppercase tracking-widest font-medium">Editor's Pick</span>
                  </div>
                  <h2 className="text-2xl md:text-5xl font-serif group-hover:text-muted-foreground transition-colors">{featured.name}</h2>
                  {featured.description && <p className="text-foreground/70 font-light leading-relaxed line-clamp-3">{featured.description}</p>}
                  <div className="flex items-center gap-4 pt-4 border-t border-border/40">
                    {featured.naturalFiberPercent != null && (
                      <div className="flex flex-col">
                        <span className="text-3xl font-serif">{featured.naturalFiberPercent}%</span>
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">Natural Fibers</span>
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-2 text-sm uppercase tracking-widest group-hover:text-muted-foreground transition-colors">
                      View Profile <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {grid.length > 0 && (
            <section className="flex flex-col gap-6 md:gap-8">
              <h2 className="text-xl md:text-2xl font-serif border-b border-border/40 pb-3 md:pb-4">Quality Approved</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {grid.map((designer: any) => {
                  const tier = getQualityTier(designer.naturalFiberPercent);
                  return (
                    <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-3 md:gap-4 active:scale-[0.98] transition-transform" data-testid={`card-edit-${designer.slug}`}>
                      <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                        <BrandImage name={designer.name} className="w-full h-full" />
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-3 left-3">
                          <span className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] font-medium ${getTierColor(tier.tier)}`}>
                            {tier.shortLabel}
                          </span>
                        </div>
                        {designer.naturalFiberPercent != null && (
                          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-t from-black/50 to-transparent">
                            <span className="text-white text-sm md:text-base font-serif">{designer.naturalFiberPercent}%</span>
                            <span className="text-white/60 text-[10px] uppercase tracking-wider ml-1">natural</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <h3 className="text-base md:text-lg font-serif group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{tier.verdict}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {remaining.length > 0 && (
            <section className="flex flex-col gap-6 md:gap-8">
              <h2 className="text-xl md:text-2xl font-serif border-b border-border/40 pb-3 md:pb-4">More Approved Designers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {remaining.map((designer: any) => {
                  const tier = getQualityTier(designer.naturalFiberPercent);
                  return (
                    <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex items-center justify-between p-4 md:p-5 border border-border/40 hover:border-foreground/30 transition-colors active:scale-[0.98]" data-testid={`card-more-${designer.slug}`}>
                      <div className="flex flex-col gap-1">
                        <h3 className="text-base md:text-lg font-serif group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                        <span className={`text-[9px] md:text-[10px] uppercase tracking-widest w-fit px-2 py-0.5 ${getTierColor(tier.tier)}`}>{tier.verdict}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {designer.naturalFiberPercent != null && <span className="text-xl font-serif">{designer.naturalFiberPercent}%</span>}
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
