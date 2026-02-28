import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, Award, ExternalLink, ShoppingBag, CheckCircle2, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners, fetchProductsByBrand } from "@/lib/supabase";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";
import { filterToCuratedBrands } from "@/lib/curated-brands";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { BrandImage } from "@/components/BrandImage";
import { getBrandProfile } from "@/lib/brand-profiles";
import { useProductFavorites } from "@/hooks/use-product-favorites";

const FEATURED_BRANDS = [
  { slug: "khaite", name: "Khaite" },
  { slug: "anine-bing", name: "Anine Bing" },
  { slug: "diesel", name: "Diesel" },
  { slug: "nili-lotan", name: "Nili Lotan" },
  { slug: "frame", name: "Frame" },
  { slug: "st-agni", name: "St. Agni" },
  { slug: "ulla-johnson", name: "Ulla Johnson" },
];

const FILTER_TABS = [
  { key: 'all', label: 'All Picks' },
  { key: 'exceptional', label: 'Exceptional' },
  { key: 'excellent', label: 'Excellent' },
] as const;

function ProductCard({ product }: { product: any }) {
  const { toggle, isFavorited } = useProductFavorites();
  const productId = String(product.id);
  const saved = isFavorited(productId);
  const shopUrl = product.url
    ? `/leaving?url=${encodeURIComponent(product.url)}&brand=${encodeURIComponent(product.brand_name || product.brandName || "")}&productId=${encodeURIComponent(productId)}`
    : null;

  const name = product.name || product.productName || "";
  const brandName = product.brand_name || product.brandName || "";
  const imageUrl = product.image_url || product.imageUrl;
  const price = product.price;
  const composition = product.composition;
  const fiberPercent = product.natural_fiber_percent || product.naturalFiberPercent;

  return (
    <div className="group flex flex-col bg-background border border-border/40 hover:border-foreground/30 transition-all" data-testid={`product-card-${product.id}`}>
      {imageUrl ? (
        <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
          />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId, brandName, price); }}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
            data-testid={`button-heart-${product.id}`}
          >
            <Heart className={`w-4 h-4 transition-colors ${saved ? "fill-red-500 text-red-500" : "text-foreground/60 hover:text-foreground"}`} />
          </button>
          {fiberPercent != null && fiberPercent >= 90 && (
            <div className="absolute top-2 left-2">
              <span className="flex items-center gap-1 bg-emerald-900/90 text-white px-2 py-0.5 text-[8px] uppercase tracking-wider backdrop-blur-sm">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {fiberPercent}% natural
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[3/4] bg-secondary/50 flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-muted-foreground/20" />
        </div>
      )}
      <div className="flex flex-col gap-1.5 p-3 md:p-4 flex-1">
        <span className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{brandName}</span>
        <h3 className="text-[13px] md:text-sm leading-snug line-clamp-2 font-medium">{name}</h3>
        {composition && (
          <p className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed line-clamp-1 mt-auto">{composition}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          {price && <span className="text-xs font-medium">{price}</span>}
          {fiberPercent != null && fiberPercent < 90 && (
            <span className="text-[9px] text-muted-foreground">{fiberPercent}% natural</span>
          )}
        </div>
      </div>
      {shopUrl && (
        <a
          href={shopUrl}
          className="flex items-center justify-center gap-2 bg-foreground text-background py-3 md:py-3.5 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-colors active:scale-[0.98]"
          data-testid={`button-shop-product-${product.id}`}
        >
          Shop Now <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

export default function JustIn() {
  const [filter, setFilter] = useState<string>('all');
  const [activeBrand, setActiveBrand] = useState<string>(FEATURED_BRANDS[0].slug);

  const { data: brandProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["edit-brand-products", activeBrand],
    queryFn: () => fetchProductsByBrand(activeBrand),
    staleTime: 10 * 60 * 1000,
  });

  const topProducts = useMemo(() => {
    return brandProducts
      .filter((p: any) => (p.image_url || p.imageUrl))
      .slice(0, 8);
  }, [brandProducts]);

  const { data: designers = [], isLoading } = useQuery({
    queryKey: ["designers-edit"],
    queryFn: () => fetchDesigners(undefined, 200),
    staleTime: 5 * 60 * 1000,
  });

  const enrichedDesigners = useMemo(() => {
    return (designers as any[]).map((d: any) => {
      if (d.naturalFiberPercent != null) return d;
      const curatedScore = getCuratedScore(d.name);
      if (curatedScore != null) return { ...d, naturalFiberPercent: curatedScore };
      return d;
    });
  }, [designers]);

  const scoredDesigners = enrichedDesigners
    .filter((d: any) => d.naturalFiberPercent != null && d.naturalFiberPercent >= 70)
    .sort((a: any, b: any) => (b.naturalFiberPercent ?? 0) - (a.naturalFiberPercent ?? 0));

  const qualityDesigners = scoredDesigners.length > 0
    ? scoredDesigners
    : filterToCuratedBrands(enrichedDesigners);

  const filtered = filter === 'all'
    ? qualityDesigners
    : qualityDesigners.filter((d: any) => {
        const tier = getQualityTier(d.naturalFiberPercent);
        return tier.tier === filter;
      });

  const grid = filtered.slice(0, 12);
  const remaining = filtered.slice(12);

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

      <section className="flex flex-col gap-6 md:gap-8" data-testid="section-featured-products">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl md:text-2xl font-serif">Featured Products</h2>
          <p className="text-sm text-muted-foreground">Shop verified pieces from our top-tier brands.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {FEATURED_BRANDS.map(brand => (
            <button
              key={brand.slug}
              onClick={() => setActiveBrand(brand.slug)}
              className={`px-4 py-2 text-[10px] md:text-xs uppercase tracking-widest whitespace-nowrap transition-colors flex-shrink-0 ${
                activeBrand === brand.slug
                  ? 'bg-foreground text-background'
                  : 'border border-border/60 text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
              data-testid={`tab-brand-${brand.slug}`}
            >
              {brand.name}
            </button>
          ))}
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-pulse">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex flex-col">
                <div className="aspect-[3/4] bg-secondary" />
                <div className="h-16 bg-secondary/50 mt-2" />
              </div>
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No products available for this brand yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {topProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Link
              href={`/designers/${activeBrand}`}
              className="flex items-center justify-center gap-2 w-full max-w-sm mx-auto border border-foreground text-foreground py-3 uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-foreground hover:text-background transition-colors active:scale-[0.98]"
              data-testid="link-view-all-brand-products"
            >
              View All {FEATURED_BRANDS.find(b => b.slug === activeBrand)?.name} Products
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        )}
      </section>

      <div className="border-t border-border/40" />

      <div className="flex flex-col gap-6 md:gap-8">
        <h2 className="text-xl md:text-2xl font-serif">Quality Approved Brands</h2>

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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 animate-pulse">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="flex flex-col gap-4">
                <div className="aspect-[3/4] bg-secondary" />
                <div className="h-5 bg-secondary w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            No designers match this filter.
          </div>
        ) : (
          <>
            {grid.length > 0 && (
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
            )}

            {remaining.length > 0 && (
              <section className="flex flex-col gap-6 md:gap-8 mt-4">
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
    </div>
  );
}
