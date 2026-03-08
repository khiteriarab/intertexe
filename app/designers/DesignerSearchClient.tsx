"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getQualityTier, getTierColor } from "../../lib/quality-tiers";
import { getCuratedScore } from "../../lib/curated-quality-scores";
import { getBrandProfile } from "../../lib/brand-profiles";

export function DesignerSearchClient() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/designers?q=${encodeURIComponent(search)}&limit=50`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const enriched = (data || []).map((d: any) => {
          if (d.naturalFiberPercent != null) return d;
          const score = getCuratedScore(d.name);
          return score != null ? { ...d, naturalFiberPercent: score } : d;
        });
        setResults(enriched);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [search]);

  const isSearching = search.length >= 2;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative w-full max-w-md mx-auto">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" /></svg>
        <input
          type="text"
          placeholder="Search 11,000+ brands..."
          className="w-full bg-background border border-border/60 pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 uppercase tracking-widest"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search-designers"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs uppercase tracking-widest"
            data-testid="button-clear-search"
          >
            Clear
          </button>
        )}
      </div>

      {isSearching && (
        <section className="flex flex-col gap-6">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-muted-foreground text-center" data-testid="text-search-count">
            {loading ? "Searching..." : `${results.length} results`}
          </p>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-pulse">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-secondary" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No brands found for &ldquo;{search}&rdquo;</p>
              <button
                onClick={() => setSearch("")}
                className="mt-4 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-back-to-brands"
              >
                Back to brands
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {results.map((designer: any) => {
                const tier = getQualityTier(designer.naturalFiberPercent);
                const profile = getBrandProfile(designer.slug);
                return (
                  <Link key={designer.id || designer.slug} href={`/designers/${designer.slug}`} className="group flex flex-col gap-2 py-3 px-3 border border-border/20 hover:border-foreground/20 transition-colors active:opacity-70" data-testid={`card-designer-${designer.slug}`}>
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
          )}
        </section>
      )}
    </div>
  );
}
