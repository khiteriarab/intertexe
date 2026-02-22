import { useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners } from "@/lib/supabase";
import { getQualityTier, getTierColor, type QualityTier } from "@/lib/quality-tiers";

const TIER_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'exceptional', label: 'Exceptional' },
  { key: 'excellent', label: 'Excellent' },
  { key: 'good', label: 'Good' },
] as const;

export default function Designers() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>('all');

  const { data: designers = [], isLoading } = useQuery({
    queryKey: ["designers", search],
    queryFn: () => fetchDesigners(search || undefined),
  });

  const filtered = tierFilter === 'all'
    ? designers as any[]
    : (designers as any[]).filter((d: any) => {
        const tier = getQualityTier(d.naturalFiberPercent);
        return tier.tier === tierFilter;
      });

  const grouped = filtered.reduce((acc: Record<string, any[]>, designer: any) => {
    const firstChar = designer.name.charAt(0).toUpperCase();
    const letter = /^[A-Z]$/.test(firstChar) ? firstChar : "#";
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(designer);
    return acc;
  }, {});

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const sortedKeys = [
    ...alphabet.filter(l => grouped[l]),
    ...(grouped["#"] ? ["#"] : []),
  ];

  return (
    <div className="py-6 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col items-center text-center gap-4 md:gap-6 max-w-2xl mx-auto">
        <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-muted-foreground">{(designers as any[]).length.toLocaleString()}+ Brands Vetted</p>
        <h1 className="text-3xl md:text-5xl font-serif">The Directory</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Every designer ranked by material quality. Filter by our quality tiers to find brands you can trust.
        </p>

        <div className="relative w-full max-w-md mt-2 md:mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search designers..."
            className="w-full bg-background border border-border/60 pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 uppercase tracking-widest"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-designers"
          />
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
              <a href="#letter-#" className="hover:text-foreground transition-colors leading-tight" data-testid="link-jump-#">#</a>
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
          ) : Object.entries(grouped).length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No designers found.</div>
          ) : (
            sortedKeys.map(letter => (
              <section key={letter} id={`letter-${letter}`} className="flex flex-col gap-4 md:gap-6 scroll-mt-24">
                <h2 className="text-3xl md:text-4xl font-serif border-b border-border/40 pb-3 md:pb-4 text-foreground/80">{letter === "#" ? "0-9 / Symbols" : letter}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {grouped[letter].map((designer: any) => {
                    const tier = getQualityTier(designer.naturalFiberPercent);
                    return (
                      <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-2 py-3 px-3 border border-border/20 hover:border-foreground/20 transition-colors active:opacity-70" data-testid={`card-designer-${designer.slug}`}>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-base md:text-lg font-serif group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                          <span className={`px-2 py-0.5 text-[8px] md:text-[9px] uppercase tracking-[0.1em] font-medium flex-shrink-0 ${getTierColor(tier.tier)}`}>
                            {tier.shortLabel}
                          </span>
                        </div>
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
