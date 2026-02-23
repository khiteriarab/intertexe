import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners } from "@/lib/supabase";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { getBrandProfile } from "@/lib/brand-profiles";

const TIER_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'exceptional', label: 'Exceptional' },
  { key: 'excellent', label: 'Excellent' },
  { key: 'good', label: 'Good' },
] as const;

export default function DesignersAll() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>('all');

  const { data: allDesigners = [], isLoading } = useQuery({
    queryKey: ["designers-all"],
    queryFn: () => fetchDesigners("", 5000),
    staleTime: 10 * 60 * 1000,
  });

  const enriched = useMemo(() =>
    (allDesigners as any[]).map((d: any) => {
      if (d.naturalFiberPercent != null) return d;
      const score = getCuratedScore(d.name);
      return score != null ? { ...d, naturalFiberPercent: score } : d;
    }),
    [allDesigners]
  );

  const filtered = useMemo(() => {
    let list = enriched;
    if (search.length >= 2) {
      const q = search.toLowerCase();
      list = list.filter((d: any) => d.name.toLowerCase().includes(q));
    }
    if (tierFilter !== 'all') {
      list = list.filter((d: any) => {
        const tier = getQualityTier(d.naturalFiberPercent);
        return tier.tier === tierFilter;
      });
    }
    return list;
  }, [enriched, search, tierFilter]);

  const { grouped, sortedKeys } = useMemo(() => {
    const g = filtered.reduce((acc: Record<string, any[]>, designer: any) => {
      const firstChar = designer.name.charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(firstChar) ? firstChar : "#";
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(designer);
      return acc;
    }, {});
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const keys = [
      ...alphabet.filter(l => g[l]),
      ...(g["#"] ? ["#"] : []),
    ];
    return { grouped: g, sortedKeys: keys };
  }, [filtered]);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="py-6 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col items-center text-center gap-4 md:gap-6 max-w-2xl mx-auto">
        <Link href="/designers" className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-to-directory">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Directory
        </Link>
        <h1 className="text-3xl md:text-5xl font-serif" data-testid="text-all-brands-title">All Brands</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Browse our full database of {enriched.length.toLocaleString()}+ brands, A to Z.
        </p>

        <div className="relative w-full max-w-md mt-2 md:mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter brands..."
            className="w-full bg-background border border-border/60 pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 uppercase tracking-widest"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-filter-all-brands"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs uppercase tracking-widest"
              data-testid="button-clear-filter"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      <div className="flex gap-2 md:gap-3 justify-center flex-wrap">
        {TIER_FILTERS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTierFilter(tab.key)}
            className={`px-3 md:px-5 py-2 text-[10px] md:text-xs uppercase tracking-widest transition-colors ${
              tierFilter === tab.key
                ? 'bg-foreground text-background'
                : 'border border-border/60 text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
            data-testid={`filter-tier-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-muted-foreground text-center" data-testid="text-filtered-count">
        {filtered.length.toLocaleString()} brands
      </p>

      <div className="flex flex-col md:flex-row gap-8 md:gap-12 mt-4 md:mt-8">
        <aside className="hidden md:block w-8 shrink-0 sticky top-32 self-start max-h-[calc(100vh-10rem)] overflow-y-auto scrollbar-hide">
          <nav className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            {alphabet.map(letter => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className={`hover:text-foreground transition-colors leading-tight ${!grouped[letter] ? 'opacity-30 pointer-events-none' : ''}`}
                data-testid={`link-jump-${letter}`}
              >
                {letter}
              </a>
            ))}
            {grouped["#"] && (
              <a href="#letter-#" className="hover:text-foreground transition-colors leading-tight" data-testid="link-jump-hash">#</a>
            )}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col gap-10 md:gap-16">
          {isLoading ? (
            <div className="flex flex-col gap-8 animate-pulse">
              {[1,2,3].map(i => (
                <div key={i}>
                  <div className="h-8 w-12 bg-secondary mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(j => <div key={j} className="h-16 bg-secondary" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : sortedKeys.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No brands found.</p>
            </div>
          ) : (
            sortedKeys.map(letter => (
              <section key={letter} id={`letter-${letter}`} className="flex flex-col gap-4 md:gap-6 scroll-mt-24">
                <h2 className="text-3xl md:text-4xl font-serif border-b border-border/40 pb-3 md:pb-4 text-foreground/80">{letter === "#" ? "0-9 / Symbols" : letter}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {grouped[letter].map((designer: any) => {
                    const tier = getQualityTier(designer.naturalFiberPercent);
                    const profile = getBrandProfile(designer.slug);
                    return (
                      <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-2 py-3 px-3 border border-border/20 hover:border-foreground/20 transition-colors active:opacity-70" data-testid={`card-designer-${designer.slug}`}>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-base md:text-lg font-serif group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                          <span className={`px-2 py-0.5 text-[8px] md:text-[9px] uppercase tracking-[0.1em] font-medium flex-shrink-0 ${getTierColor(tier.tier)}`}>
                            {tier.shortLabel}
                          </span>
                        </div>
                        {profile && (
                          <div className="flex flex-wrap gap-1">
                            {profile.materialStrengths.slice(0, 3).map(mat => (
                              <span key={mat} className="text-[8px] uppercase tracking-wider text-muted-foreground bg-secondary/60 px-1.5 py-0.5">{mat}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          {designer.naturalFiberPercent != null ? (
                            <span className="text-xs text-muted-foreground">{designer.naturalFiberPercent}% Natural</span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">Pending review</span>
                          )}
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{tier.verdict}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
