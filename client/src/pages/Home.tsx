import { useRef, useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners, fetchDesignerBySlug, fetchProductSample, fetchProductCount, fetchProductsByFiber, fetchProductsByBrandWithImages, fetchProductCountsByBrand } from "@/lib/supabase";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { BrandImage } from "@/components/BrandImage";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import heroImage from "@/assets/images/hero-fashion.jpg";

const CURATED_BRAND_SLUGS = [
  "sandro",
  "khaite",
  "anine-bing",
  "frame",
  "nanushka",
  "nili-lotan",
  "ulla-johnson",
  "st-agni",
  "faithfull-the-brand",
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

  const shopUrl = product.url
    ? `/leaving?url=${encodeURIComponent(product.url)}&brand=${encodeURIComponent(brandName)}`
    : null;

  const CardWrapper = shopUrl ? 'a' : 'div';
  const wrapperProps = shopUrl ? { href: shopUrl } : {};

  return (
    <CardWrapper {...wrapperProps} className="group flex-shrink-0 w-[160px] md:w-[220px] flex flex-col cursor-pointer" data-testid={`product-home-${product.id}`}>
      <div className="aspect-[3/4] bg-[#f5f5f5] relative overflow-hidden">
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
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId); }}
          className={`absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center transition-opacity duration-200 ${saved ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          aria-label={saved ? "Remove from favorites" : "Save to favorites"}
        >
          <Heart className={`w-4 h-4 drop-shadow-sm ${saved ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>
      </div>
      <div className="flex flex-col gap-0.5 pt-2.5">
        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em]">{brandName}</span>
        <h3 className="text-[11px] md:text-[12px] leading-snug line-clamp-2 text-muted-foreground">{name}</h3>
        {price && <span className="text-[11px] md:text-[12px] mt-0.5">{price}</span>}
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

  const { data: otherNewProducts = [] } = useQuery({
    queryKey: ["home-new-in"],
    queryFn: () => fetchProductSample(24),
    staleTime: 10 * 60 * 1000,
  });

  const newInProducts = useMemo(() => {
    const alcIds = new Set(alcProducts.map((p: any) => p.id));
    const others = otherNewProducts.filter((p: any) => !alcIds.has(p.id));
    return [...alcProducts, ...others].slice(0, 30);
  }, [alcProducts, otherNewProducts]);

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

      <section className="relative h-[75vh] md:h-[80vh] min-h-[480px] flex items-end overflow-hidden -mx-4 md:-mx-8">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Luxury Fashion Editorial"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/5" />
        </div>

        <div className="relative z-10 px-5 md:px-10 pb-12 md:pb-16 max-w-2xl flex flex-col" style={{ paddingBottom: 'max(3rem, calc(env(safe-area-inset-bottom, 0px) + 2.5rem))' }}>
          <h1 className="text-[32px] leading-[1.15] md:text-6xl font-serif text-white mb-4 md:mb-6" data-testid="text-hero-headline">
            The Material Authority
          </h1>
          <p className="text-[13px] md:text-lg text-white/80 mb-6 md:mb-8 font-light leading-relaxed max-w-md" data-testid="text-hero-subtext">
            {productCount > 0 ? productCount.toLocaleString() : '17,000+'} verified products. Every fabric checked. Every brand ranked.
          </p>
          <Link href="/shop" className="bg-white text-black px-6 py-3.5 md:px-8 md:py-4 uppercase tracking-[0.15em] text-xs md:text-sm font-medium hover:bg-white/90 transition-colors flex items-center gap-2 w-fit active:scale-[0.97]" data-testid="button-shop-now">
            Shop Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {newInProducts.length > 0 && (
        <section className="py-10 md:py-16">
          <HorizontalProductScroll
            products={newInProducts}
            title="New In"
            subtitle={`${productCount > 0 ? productCount.toLocaleString() : '17,000+'} verified products`}
            linkHref="/shop"
            linkText="Shop New In"
          />
        </section>
      )}

      <section className="py-8 md:py-14 border-t border-border/30">
        <div className="flex justify-between items-end mb-8 md:mb-10">
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1">INTERTEXE Approved</p>
            <h2 className="text-2xl md:text-3xl font-serif">The Brands We Love</h2>
          </div>
          <Link href="/designers" className="text-[10px] md:text-sm uppercase tracking-[0.15em] hover:text-muted-foreground transition-colors" data-testid="link-view-all-designers">
            View All
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
              const productCount = productCountByBrand[designer.slug] || 0;
              return (
                <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-2.5 active:scale-[0.98] transition-transform" data-testid={`card-designer-${designer.id}`}>
                  <div className="aspect-[3/4] bg-[#f5f5f5] w-full overflow-hidden relative">
                    <BrandImage name={designer.name} className="absolute inset-0 w-full h-full" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                    {productCount > 0 && (
                      <div className="absolute bottom-2.5 right-2.5">
                        <span className="flex items-center gap-1 bg-white/90 text-black px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
                          <ShoppingBag className="w-2.5 h-2.5" />
                          {productCount} products
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.06em] group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">{tier.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {cashmereProducts.length > 0 && (
        <section className="py-8 md:py-14 border-t border-border/30">
          <HorizontalProductScroll
            products={cashmereProducts}
            title="The Cashmere Edit"
            subtitle="Pure luxury, verified"
            linkHref="/materials/cashmere"
            linkText="Shop all cashmere"
          />
        </section>
      )}

      <section className="-mx-4 md:-mx-8 grid grid-cols-1 md:grid-cols-2">
        <Link href="/materials/silk-tops" className="group relative aspect-[4/3] md:aspect-[3/2] overflow-hidden flex items-end" data-testid="link-edit-silk">
          <div className="absolute inset-0 bg-[#f5f5f5]">
            {silkProducts[0] && (silkProducts[0].image_url || silkProducts[0].imageUrl) && (
              <img
                src={silkProducts[0].image_url || silkProducts[0].imageUrl}
                alt="Silk Edit"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          </div>
          <div className="relative z-10 p-6 md:p-8 flex flex-col gap-1">
            <h3 className="text-white text-xl md:text-2xl font-serif">The Silk Edit</h3>
            <p className="text-white/70 text-xs md:text-sm">Blouses, dresses, and camisoles in pure silk</p>
            <span className="text-white/90 text-[10px] uppercase tracking-[0.15em] mt-2 flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
              Shop the edit <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
        <Link href="/materials/linen-dresses" className="group relative aspect-[4/3] md:aspect-[3/2] overflow-hidden flex items-end" data-testid="link-edit-linen">
          <div className="absolute inset-0 bg-[#f5f5f5]">
            {linenProducts[0] && (linenProducts[0].image_url || linenProducts[0].imageUrl) && (
              <img
                src={linenProducts[0].image_url || linenProducts[0].imageUrl}
                alt="Linen Edit"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          </div>
          <div className="relative z-10 p-6 md:p-8 flex flex-col gap-1">
            <h3 className="text-white text-xl md:text-2xl font-serif">Linen for Every Day</h3>
            <p className="text-white/70 text-xs md:text-sm">Dresses, tops, and suiting in natural linen</p>
            <span className="text-white/90 text-[10px] uppercase tracking-[0.15em] mt-2 flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
              Shop the edit <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </section>

      {silkProducts.length > 0 && (
        <section className="py-8 md:py-14">
          <HorizontalProductScroll
            products={silkProducts}
            title="Silk Essentials"
            subtitle="Effortless elegance"
            linkHref="/materials/silk"
            linkText="Shop all silk"
          />
        </section>
      )}

      <section className="border-t border-b border-border/30 -mx-4 md:-mx-8 px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/30">
          <div className="py-8 md:py-12 flex flex-col items-center text-center gap-1">
            <span className="text-2xl md:text-4xl font-serif">{(designers as any[]).length.toLocaleString()}+</span>
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Brands Vetted</span>
          </div>
          <div className="py-8 md:py-12 flex flex-col items-center text-center gap-1">
            <span className="text-2xl md:text-4xl font-serif">{productCount > 0 ? productCount.toLocaleString() : '17,000+'}</span>
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Verified Products</span>
          </div>
          <div className="py-8 md:py-12 flex flex-col items-center text-center gap-1">
            <span className="text-2xl md:text-4xl font-serif">5</span>
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Material Guides</span>
          </div>
          <div className="py-8 md:py-12 flex flex-col items-center text-center gap-1">
            <span className="text-2xl md:text-4xl font-serif">100%</span>
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Composition Verified</span>
          </div>
        </div>
      </section>

      <section className="text-center py-12 md:py-20 max-w-2xl mx-auto flex flex-col items-center gap-4 md:gap-6">
        <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground">Personalized For You</p>
        <h2 className="text-2xl md:text-4xl font-serif leading-tight">Not Sure Where to Start?</h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-md leading-relaxed">
          Take our 2-minute quiz. We'll match you with your fabric persona and recommend the designers you'll love.
        </p>
        <Link href="/quiz" className="bg-foreground text-background px-8 py-3.5 uppercase tracking-[0.15em] text-xs font-medium hover:bg-foreground/90 transition-colors mt-2 active:scale-95" data-testid="button-cta-quiz">
          Find My Designers
        </Link>
      </section>
    </div>
  );
}
