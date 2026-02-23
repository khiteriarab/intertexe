import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, ShoppingBag, ArrowRight, List } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners } from "@/lib/supabase";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { getBrandProfile } from "@/lib/brand-profiles";

const BRANDS_WITH_PRODUCTS: { slug: string; name: string; products: number }[] = [
  { slug: "aje", name: "Aje", products: 1360 },
  { slug: "tibi", name: "Tibi", products: 1300 },
  { slug: "rails", name: "Rails", products: 1283 },
  { slug: "ted-baker", name: "Ted Baker", products: 915 },
  { slug: "citizens-of-humanity", name: "Citizens of Humanity", products: 902 },
  { slug: "l-agence", name: "L'Agence", products: 880 },
  { slug: "veronica-beard", name: "Veronica Beard", products: 831 },
  { slug: "velvet-by-graham-spencer", name: "Velvet by Graham & Spencer", products: 800 },
  { slug: "joseph", name: "Joseph", products: 757 },
  { slug: "mother", name: "Mother Denim", products: 736 },
  { slug: "club-monaco", name: "Club Monaco", products: 695 },
  { slug: "faithfull-the-brand", name: "Faithfull the Brand", products: 694 },
  { slug: "ulla-johnson", name: "Ulla Johnson", products: 505 },
  { slug: "dl1961", name: "DL1961", products: 503 },
  { slug: "dissh", name: "Dissh", products: 499 },
  { slug: "fleur-du-mal", name: "Fleur du Mal", products: 441 },
  { slug: "st-agni", name: "St. Agni", products: 432 },
  { slug: "cult-gaia", name: "Cult Gaia", products: 322 },
  { slug: "rebecca-taylor", name: "Rebecca Taylor", products: 315 },
  { slug: "sea-new-york", name: "Sea New York", products: 299 },
  { slug: "a-l-c-", name: "A.L.C.", products: 250 },
  { slug: "rixo", name: "Rixo", products: 241 },
  { slug: "re-done", name: "Re/Done", products: 235 },
  { slug: "camilla-and-marc", name: "Camilla and Marc", products: 210 },
  { slug: "nili-lotan", name: "Nili Lotan", products: 205 },
  { slug: "tanya-taylor", name: "Tanya Taylor", products: 202 },
  { slug: "sir-the-label", name: "Sir the Label", products: 195 },
  { slug: "nanushka", name: "Nanushka", products: 172 },
  { slug: "frame", name: "Frame", products: 131 },
  { slug: "anine-bing", name: "Anine Bing", products: 113 },
  { slug: "derek-lam", name: "Derek Lam 10 Crosby", products: 113 },
  { slug: "rodebjer", name: "Rodebjer", products: 112 },
  { slug: "maria-mcmanus", name: "Maria McManus", products: 98 },
  { slug: "khaite", name: "Khaite", products: 96 },
  { slug: "rachel-comey", name: "Rachel Comey", products: 86 },
  { slug: "stine-goya", name: "Stine Goya", products: 45 },
  { slug: "mara-hoffman", name: "Mara Hoffman", products: 42 },
  { slug: "esse-studios", name: "Esse Studios", products: 32 },
  { slug: "sandro", name: "Sandro", products: 26 },
  { slug: "agolde", name: "AGOLDE", products: 22 },
  { slug: "reformation", name: "Reformation", products: 13 },
  { slug: "veda", name: "Veda", products: 11 },
  { slug: "the-kooples", name: "The Kooples", products: 9 },
  { slug: "toteme", name: "Totême", products: 2 },
];

export default function Designers() {
  const [search, setSearch] = useState("");

  const { data: searchResults = [], isLoading: searchLoading, isFetching: searchFetching } = useQuery({
    queryKey: ["designers-search", search],
    queryFn: () => fetchDesigners(search, 50),
    enabled: search.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const isSearching = search.length >= 2;

  const enrichedSearchResults = useMemo(() =>
    (searchResults as any[]).map((d: any) => {
      if (d.naturalFiberPercent != null) return d;
      const score = getCuratedScore(d.name);
      return score != null ? { ...d, naturalFiberPercent: score } : d;
    }),
    [searchResults]
  );

  const totalProducts = BRANDS_WITH_PRODUCTS.reduce((sum, b) => sum + b.products, 0);

  return (
    <div className="py-6 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col items-center text-center gap-4 md:gap-6 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-serif" data-testid="text-directory-title">The Directory</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {totalProducts.toLocaleString()}+ verified products across {BRANDS_WITH_PRODUCTS.length} brands, every item checked for natural fiber composition.
        </p>

        <div className="relative w-full max-w-md mt-2 md:mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
      </header>

      {isSearching ? (
        <section className="flex flex-col gap-6">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-muted-foreground text-center" data-testid="text-search-count">
            {searchLoading || searchFetching ? "Searching..." : `${enrichedSearchResults.length} results`}
          </p>
          {searchLoading || searchFetching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-pulse">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-secondary" />)}
            </div>
          ) : enrichedSearchResults.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No brands found for "{search}"</p>
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
              {enrichedSearchResults.map((designer: any) => {
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
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-6 md:gap-8" data-testid="section-brands-with-products">
          <div className="flex items-center justify-center gap-2">
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xl md:text-2xl font-serif">Brands You Can Shop</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {BRANDS_WITH_PRODUCTS.map(brand => {
              const score = getCuratedScore(brand.name);
              const tier = getQualityTier(score);
              return (
                <Link
                  key={brand.slug}
                  href={`/designers/${brand.slug}`}
                  className="group flex flex-col gap-2 p-3 md:p-4 border border-border/20 hover:border-foreground/20 transition-all active:opacity-70"
                  data-testid={`card-shoppable-${brand.slug}`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <h3 className="text-sm md:text-base font-serif leading-tight group-hover:text-muted-foreground transition-colors">{brand.name}</h3>
                    {score != null && (
                      <span className={`px-1.5 py-0.5 text-[7px] md:text-[8px] uppercase tracking-[0.1em] font-medium flex-shrink-0 ${getTierColor(tier.tier)}`}>
                        {tier.shortLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-muted-foreground">{brand.products.toLocaleString()} products</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
            <Link
              href="/shop"
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 bg-foreground text-background py-3.5 uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-foreground/90 transition-colors active:scale-[0.98]"
              data-testid="link-shop-all-from-directory"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Shop All Products
            </Link>
            <Link
              href="/designers/all"
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 border border-foreground text-foreground py-3.5 uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-foreground hover:text-background transition-colors active:scale-[0.98]"
              data-testid="link-display-all-brands"
            >
              <List className="w-3.5 h-3.5" />
              Display All Brands
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
