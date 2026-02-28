import { useRef, useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag, Heart, Scan } from "lucide-react";
import { trackAffiliateRedirect } from "@/lib/analytics";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners, fetchDesignerBySlug, fetchProductCount, fetchProductsByFiber, fetchProductsByBrandWithImages, fetchProductCountsByBrand } from "@/lib/supabase";
import { getQualityTier } from "@/lib/quality-tiers";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { BrandImage } from "@/components/BrandImage";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import heroImage from "@/assets/images/hero-fashion.jpg";

const CURATED_BRAND_SLUGS = [
  "khaite",
  "anine-bing",
  "toteme",
  "frame",
  "diesel",
  "nanushka",
  "acne-studios",
  "the-row",
  "sandro",
  "agolde",
];

function ProductCardSmall({ product }: { product: any }) {
  const { toggle, isFavorited } = useProductFavorites();
  const productId = String(product.id);
  const saved = isFavorited(productId);
  const name = product.name || product.productName || "";
  const brandName = product.brand_name || product.brandName || "";
  const imageUrl = product.image_url || product.imageUrl;
  const price = product.price;
  const composition = product.composition;

  const shopUrl = product.url || null;

  const CardWrapper = shopUrl ? 'a' : 'div';
  const handleClick = shopUrl ? () => { trackAffiliateRedirect(brandName, shopUrl); } : undefined;
  const wrapperProps = shopUrl ? { href: shopUrl, target: "_blank" as const, rel: "noopener noreferrer", onClick: handleClick } : {};

  return (
    <CardWrapper {...wrapperProps} className="group flex-shrink-0 w-[160px] md:w-[220px] flex flex-col cursor-pointer" data-testid={`product-home-${product.id}`}>
      <div className="aspect-[3/4] bg-[#f0f0ee] relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-neutral-300" />
          </div>
        )}
        {composition && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent pt-5 pb-1.5 px-2">
            <span className="text-[8px] md:text-[9px] text-white/90 uppercase tracking-[0.04em] font-medium line-clamp-1">
              {composition}
            </span>
          </div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId, brandName, price); }}
          className={`absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center transition-opacity duration-200 ${saved ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          aria-label={saved ? "Remove from favorites" : "Save to favorites"}
        >
          <Heart className={`w-4 h-4 drop-shadow-sm ${saved ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>
      </div>
      <div className="flex flex-col gap-0.5 pt-2.5">
        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em]">{brandName}</span>
        <h3 className="text-[11px] md:text-[12px] leading-snug line-clamp-2 text-muted-foreground">{name}</h3>
        {price && <span className="text-[11px] md:text-[12px] mt-0.5 font-medium">{price}</span>}
      </div>
    </CardWrapper>
  );
}

function HorizontalProductScroll({ products, title, subtitle, linkHref, linkText }: {
  products: any[];
  title: string;
  subtitle?: string;
  linkHref: string;
  linkText: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -400 : 400;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex items-center justify-between">
        <Link href={linkHref} className="flex items-center gap-3 group" data-testid={`link-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          <div className="flex flex-col">
            {subtitle && <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{subtitle}</span>}
            <h2 className="text-lg md:text-2xl font-serif group-hover:text-muted-foreground transition-colors">{title}</h2>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <div className="hidden md:flex items-center gap-1">
          <button onClick={() => scroll("left")} className="w-9 h-9 border border-border/50 flex items-center justify-center hover:border-foreground/40 transition-colors" aria-label="Scroll left">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll("right")} className="w-9 h-9 border border-border/50 flex items-center justify-center hover:border-foreground/40 transition-colors" aria-label="Scroll right">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-8 md:px-8 pb-2">
        {products.map((product: any) => (
          <ProductCardSmall key={product.id} product={product} />
        ))}
      </div>

      <Link href={linkHref} className="self-start text-[10px] md:text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5" data-testid={`link-shop-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        {linkText} <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

export default function Home() {
  const { data: designers = [] } = useQuery({
    queryKey: ["designers-home"],
    queryFn: () => fetchDesigners(undefined, 100),
    staleTime: 5 * 60 * 1000,
  });

  const { data: curatedDesigners = [], isLoading: curatedLoading } = useQuery({
    queryKey: ["curated-brands"],
    queryFn: async () => {
      const results = await Promise.all(
        CURATED_BRAND_SLUGS.map(async (slug) => {
          const designer = await fetchDesignerBySlug(slug);
          return designer || null;
        })
      );
      return results.filter(Boolean).map((d: any) => {
        if (d.naturalFiberPercent != null) return d;
        const score = getCuratedScore(d.name);
        return score != null ? { ...d, naturalFiberPercent: score } : d;
      }) as any[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: productCount = 0 } = useQuery({
    queryKey: ["product-count"],
    queryFn: fetchProductCount,
    staleTime: 10 * 60 * 1000,
  });

  const { data: alcProducts = [] } = useQuery({
    queryKey: ["home-alc-products"],
    queryFn: () => fetchProductsByBrandWithImages("a-l-c-", 24),
    staleTime: 10 * 60 * 1000,
  });

  const { data: dieselProducts = [] } = useQuery({
    queryKey: ["home-diesel-products"],
    queryFn: () => fetchProductsByBrandWithImages("diesel", 24),
    staleTime: 10 * 60 * 1000,
  });

  const newInProducts = useMemo(() => {
    const seenIds = new Set<string>();
    const combined: any[] = [];
    for (const p of [...alcProducts, ...dieselProducts]) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        combined.push(p);
      }
    }
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }
    return combined.slice(0, 30);
  }, [alcProducts, dieselProducts]);

  const { data: cashmereProducts = [] } = useQuery({
    queryKey: ["home-cashmere"],
    queryFn: () => fetchProductsByFiber("cashmere"),
    staleTime: 10 * 60 * 1000,
    select: (data: any[]) => data.slice(0, 16),
  });

  const { data: silkProducts = [] } = useQuery({
    queryKey: ["home-silk"],
    queryFn: () => fetchProductsByFiber("silk"),
    staleTime: 10 * 60 * 1000,
    select: (data: any[]) => data.slice(0, 16),
  });

  const { data: linenProducts = [] } = useQuery({
    queryKey: ["home-linen"],
    queryFn: () => fetchProductsByFiber("linen"),
    staleTime: 10 * 60 * 1000,
    select: (data: any[]) => data.slice(0, 16),
  });

  const { data: productCountByBrand = {} } = useQuery({
    queryKey: ["brand-product-counts", CURATED_BRAND_SLUGS],
    queryFn: () => fetchProductCountsByBrand(CURATED_BRAND_SLUGS),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="flex flex-col gap-0">

      <section className="relative h-[85vh] md:h-[90vh] min-h-[540px] flex items-end overflow-hidden -mx-4 md:-mx-8">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Luxury Fashion Editorial"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        <div className="relative z-10 w-full px-5 md:px-10 pb-12 md:pb-16 flex flex-col" style={{ paddingBottom: 'max(3rem, calc(env(safe-area-inset-bottom, 0px) + 2.5rem))' }}>
          <h1 className="text-[36px] leading-[1.1] md:text-7xl font-serif text-white mb-3 md:mb-5 max-w-xl" data-testid="text-hero-headline">
            Shop by Fabric
          </h1>
          <p className="text-[13px] md:text-lg text-white/70 mb-7 md:mb-9 font-light leading-relaxed max-w-md" data-testid="text-hero-subtext">
            {productCount > 0 ? productCount.toLocaleString() : '17,000+'} verified products. Choose your fabrics, browse ranked pieces, shop better materials instantly.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop" className="bg-white text-black px-7 py-3.5 md:px-9 md:py-4 uppercase tracking-[0.15em] text-[11px] md:text-xs font-medium hover:bg-white/90 transition-colors flex items-center gap-2 active:scale-[0.97]" data-testid="button-shop-now">
              Shop Now <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/scanner" className="border border-white/40 text-white px-6 py-3.5 md:px-8 md:py-4 uppercase tracking-[0.15em] text-[11px] md:text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-2 active:scale-[0.97] backdrop-blur-sm" data-testid="button-scanner-cta">
              <Scan className="w-3.5 h-3.5" /> Scan a Product
            </Link>
          </div>
        </div>
      </section>

      <section className="-mx-4 md:-mx-8 bg-[#111] text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          <div className="py-6 md:py-8 flex flex-col items-center text-center gap-0.5">
            <span className="text-xl md:text-3xl font-serif">{(designers as any[]).length.toLocaleString()}+</span>
            <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-white/50">Brands Ranked</span>
          </div>
          <div className="py-6 md:py-8 flex flex-col items-center text-center gap-0.5">
            <span className="text-xl md:text-3xl font-serif">{productCount > 0 ? productCount.toLocaleString() : '17,000+'}</span>
            <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-white/50">Verified Products</span>
          </div>
          <div className="py-6 md:py-8 flex flex-col items-center text-center gap-0.5">
            <span className="text-xl md:text-3xl font-serif">5</span>
            <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-white/50">Material Guides</span>
          </div>
          <div className="py-6 md:py-8 flex flex-col items-center text-center gap-0.5">
            <span className="text-xl md:text-3xl font-serif">100%</span>
            <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-white/50">Composition Data</span>
          </div>
        </div>
      </section>

      {newInProducts.length > 0 && (
        <section className="py-10 md:py-16">
          <HorizontalProductScroll
            products={newInProducts}
            title="New In"
            subtitle="Just landed"
            linkHref="/shop"
            linkText="Shop all new arrivals"
          />
        </section>
      )}

      <section className="-mx-4 md:-mx-8 grid grid-cols-2">
        <Link href="/materials/cashmere" className="group relative aspect-[3/4] md:aspect-[4/5] overflow-hidden flex items-end" data-testid="link-edit-cashmere-hero">
          <div className="absolute inset-0 bg-[#e8e4df]">
            {cashmereProducts[0] && (cashmereProducts[0].image_url || cashmereProducts[0].imageUrl) && (
              <img src={cashmereProducts[0].image_url || cashmereProducts[0].imageUrl} alt="Cashmere" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
          <div className="relative z-10 p-4 md:p-8">
            <p className="text-[8px] md:text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1">The Edit</p>
            <h3 className="text-white text-base md:text-2xl font-serif mb-1 md:mb-2">Cashmere</h3>
            <span className="text-white/70 text-[9px] md:text-[11px] uppercase tracking-[0.12em] flex items-center gap-1 group-hover:gap-2 transition-all">
              Shop now <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
        <Link href="/materials/silk" className="group relative aspect-[3/4] md:aspect-[4/5] overflow-hidden flex items-end" data-testid="link-edit-silk-hero">
          <div className="absolute inset-0 bg-[#ece6e0]">
            {silkProducts[0] && (silkProducts[0].image_url || silkProducts[0].imageUrl) && (
              <img src={silkProducts[0].image_url || silkProducts[0].imageUrl} alt="Silk" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
          <div className="relative z-10 p-4 md:p-8">
            <p className="text-[8px] md:text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1">The Edit</p>
            <h3 className="text-white text-base md:text-2xl font-serif mb-1 md:mb-2">Silk</h3>
            <span className="text-white/70 text-[9px] md:text-[11px] uppercase tracking-[0.12em] flex items-center gap-1 group-hover:gap-2 transition-all">
              Shop now <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </section>

      {cashmereProducts.length > 0 && (
        <section className="py-10 md:py-16">
          <HorizontalProductScroll
            products={cashmereProducts}
            title="The Cashmere Edit"
            subtitle="Pure luxury, verified"
            linkHref="/materials/cashmere"
            linkText="Shop all cashmere"
          />
        </section>
      )}

      <section className="py-8 md:py-14 border-t border-border/30">
        <div className="flex justify-between items-end mb-8 md:mb-10">
          <div>
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Curated</p>
            <h2 className="text-xl md:text-3xl font-serif">The Brands We Love</h2>
          </div>
          <Link href="/designers" className="text-[10px] md:text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1" data-testid="link-view-all-designers">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {curatedLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-5">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <div key={i} className="flex flex-col gap-3 animate-pulse">
                <div className="aspect-[3/4] bg-[#f0f0ee]" />
                <div className="h-4 bg-[#f0f0ee] w-3/4" />
                <div className="h-3 bg-[#f0f0ee] w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-5">
            {curatedDesigners.map((designer: any) => {
              const tier = getQualityTier(designer.naturalFiberPercent);
              const pCount = productCountByBrand[designer.slug] || 0;
              return (
                <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-2 active:scale-[0.98] transition-transform" data-testid={`card-designer-${designer.id}`}>
                  <div className="aspect-[3/4] bg-[#f0f0ee] w-full overflow-hidden relative">
                    <BrandImage name={designer.name} className="absolute inset-0 w-full h-full" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                    {pCount > 0 && (
                      <div className="absolute bottom-2 right-2">
                        <span className="flex items-center gap-1 bg-white/90 text-black px-1.5 py-0.5 text-[7px] md:text-[8px] uppercase tracking-[0.08em] font-medium backdrop-blur-sm">
                          <ShoppingBag className="w-2.5 h-2.5" />
                          {pCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-0">
                    <h3 className="text-[11px] md:text-[12px] font-semibold uppercase tracking-[0.06em] group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                    <p className="text-[8px] md:text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{tier.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="-mx-4 md:-mx-8">
        <Link href="/materials/linen" className="group relative block aspect-[16/9] md:aspect-[21/9] overflow-hidden" data-testid="link-linen-banner">
          <div className="absolute inset-0 bg-[#ddd8d0]">
            {linenProducts[0] && (linenProducts[0].image_url || linenProducts[0].imageUrl) && (
              <img src={linenProducts[0].image_url || linenProducts[0].imageUrl} alt="Linen" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-1000" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
          </div>
          <div className="absolute inset-0 z-10 flex items-center px-6 md:px-14">
            <div>
              <p className="text-[8px] md:text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1 md:mb-2">Summer Essentials</p>
              <h3 className="text-xl md:text-4xl font-serif text-white mb-2 md:mb-3">Linen for Every Day</h3>
              <p className="text-[11px] md:text-sm text-white/60 mb-4 md:mb-6 max-w-sm">Breathable, natural, and endlessly versatile. Dresses, tops, and suiting in pure linen.</p>
              <span className="text-white text-[10px] md:text-[11px] uppercase tracking-[0.15em] flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                Shop Linen <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </Link>
      </section>

      {silkProducts.length > 0 && (
        <section className="py-10 md:py-16">
          <HorizontalProductScroll
            products={silkProducts}
            title="Silk Essentials"
            subtitle="Effortless elegance"
            linkHref="/materials/silk"
            linkText="Shop all silk"
          />
        </section>
      )}

      <section className="-mx-4 md:-mx-8 bg-[#FAFAF8] border-t border-b border-border/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 px-6 md:px-14 py-12 md:py-20 max-w-5xl mx-auto">
          <div className="text-center md:text-left flex-1">
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">New Feature</p>
            <h2 className="text-xl md:text-3xl font-serif mb-3 leading-tight">Shopping Intelligence</h2>
            <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto md:mx-0">
              Scan any clothing tag or paste a product URL. We'll identify the brand, analyze the materials, rate the quality, and suggest better alternatives.
            </p>
          </div>
          <Link href="/scanner" className="bg-[#111] text-white px-8 py-3.5 md:px-10 md:py-4 uppercase tracking-[0.15em] text-[11px] md:text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center gap-2.5 active:scale-[0.97] flex-shrink-0" data-testid="button-scanner-home">
            <Scan className="w-4 h-4" /> Try Scanner
          </Link>
        </div>
      </section>

      <section className="text-center py-14 md:py-24 max-w-xl mx-auto flex flex-col items-center gap-4 md:gap-5">
        <p className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Personalized For You</p>
        <h2 className="text-xl md:text-4xl font-serif leading-tight">Not Sure Where to Start?</h2>
        <p className="text-muted-foreground text-[13px] md:text-sm max-w-sm leading-relaxed">
          Take our 2-minute quiz. We'll match you with your fabric persona and recommend the designers you'll love.
        </p>
        <Link href="/quiz" className="bg-foreground text-background px-8 py-3.5 uppercase tracking-[0.15em] text-[11px] font-medium hover:bg-foreground/90 transition-colors mt-2 active:scale-95" data-testid="button-cta-quiz">
          Find My Designers
        </Link>
      </section>
    </div>
  );
}
