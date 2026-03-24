"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag, Heart } from "lucide-react";
import { getQualityTier, getTierColor } from "../../lib/quality-tiers";
import { getBrandHeroImage } from "../../lib/brand-hero-images";

function optimizeImageUrl(url: string, width: number): string {
  if (!url) return url;
  if (url.includes("cdn.shopify.com")) {
    const separator = url.includes("?") ? "&" : "?";
    return url + separator + "width=" + width;
  }
  return url;
}

function ProductCardSmall({ product, eager }: { product: any; eager?: boolean }) {
  const name = product.name || "";
  const brandName = product.brandName || "";
  const imageUrl = product.imageUrl || "";
  const price = product.price;
  const composition = product.composition;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex-shrink-0 w-[160px] md:w-[220px] flex flex-col cursor-pointer"
      data-testid={`product-home-${product.id}`}
    >
      <div className="aspect-[3/4] bg-[#f5f5f5] relative overflow-hidden">
        {imageUrl ? (
          <img
            src={optimizeImageUrl(imageUrl, 440)}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            loading={eager ? "eager" : "lazy"}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-neutral-300" />
          </div>
        )}
        {composition && (
          <div className="absolute bottom-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="bg-black/70 text-white px-2 py-0.5 text-[8px] md:text-[9px] uppercase tracking-[0.05em] font-medium backdrop-blur-sm line-clamp-1 max-w-[140px] md:max-w-[200px]">
              {composition}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 pt-2.5">
        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em]">
          {brandName}
        </span>
        <h3 className="text-[11px] md:text-[12px] leading-snug truncate text-muted-foreground">
          {name}
        </h3>
        {price && (
          <span className="text-[11px] md:text-[12px] mt-0.5">{price}</span>
        )}
      </div>
    </Link>
  );
}

export function HorizontalProductScroll({
  products,
  title,
  subtitle,
  linkHref,
  linkText,
  eager,
}: {
  products: any[];
  title: string;
  subtitle?: string;
  linkHref: string;
  linkText: string;
  eager?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -400 : 400;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (!products || products.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex items-center justify-between">
        <Link
          href={linkHref}
          className="flex items-center gap-3 group"
          data-testid={`link-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div className="flex flex-col gap-0.5">
            {subtitle && (
              <span className="text-[8px] md:text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                {subtitle}
              </span>
            )}
            <h2 className="text-[20px] md:text-[28px] font-serif group-hover:text-muted-foreground transition-colors leading-tight">
              {title}
            </h2>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-9 h-9 border border-border/50 flex items-center justify-center hover:border-foreground/40 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-9 h-9 border border-border/50 flex items-center justify-center hover:border-foreground/40 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-8 md:px-8 pb-2"
      >
        {products.map((product: any, i: number) => (
          <ProductCardSmall key={product.id} product={product} eager={eager && i < 4} />
        ))}
      </div>

      <Link
        href={linkHref}
        className="self-start text-[10px] md:text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        data-testid={`link-shop-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {linkText} <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function BrandCardImage({ name, count }: { name: string; count: number }) {
  const [failed, setFailed] = useState(false);
  const heroUrl = getBrandHeroImage(name);
  const hasImage = heroUrl && !failed;

  return (
    <div className={`aspect-[3/4] w-full overflow-hidden relative ${hasImage ? 'bg-secondary' : 'bg-[#f0ece6]'}`}>
      {hasImage ? (
        <img
          src={heroUrl}
          alt={`${name} editorial`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <span className="font-serif text-lg md:text-xl text-foreground/30 tracking-[0.15em] uppercase text-center leading-relaxed">
            {name}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
      {count > 0 && (
        <div className="absolute bottom-2.5 right-2.5">
          <span className="flex items-center gap-1 bg-white/90 text-black px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
            <ShoppingBag className="w-2.5 h-2.5" />
            {count} products
          </span>
        </div>
      )}
    </div>
  );
}

export function BrandGrid({
  designers,
  productCounts,
}: {
  designers: any[];
  productCounts: Record<string, number>;
}) {
  if (!designers || designers.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-5">
      {designers.map((designer: any) => {
        const tier = getQualityTier(designer.naturalFiberPercent);
        const count = productCounts[designer.slug] || 0;
        return (
          <Link
            key={designer.id}
            href={`/designers/${designer.slug}`}
            className="group flex flex-col gap-2.5 active:scale-[0.98] transition-transform"
            data-testid={`card-designer-${designer.id}`}
          >
            <BrandCardImage name={designer.name} count={count} />
            <div className="flex flex-col gap-0.5">
              <h3 className="text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.06em] group-hover:text-muted-foreground transition-colors">
                {designer.name}
              </h3>
              <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">
                {tier.label}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

interface HomePageData {
  designers: any[];
  productCount: number;
  cashmereProducts: any[];
  silkProducts: any[];
  linenProducts: any[];
  productCountByBrand: Record<string, number>;
  curatedDesigners: any[];
  newInProducts: any[];
  saleProducts: any[];
}

export function HomePageContent({ initialData }: { initialData?: HomePageData }) {
  const [data, setData] = useState<HomePageData>(initialData || {
    designers: [],
    productCount: 0,
    cashmereProducts: [],
    silkProducts: [],
    linenProducts: [],
    productCountByBrand: {},
    curatedDesigners: [],
    newInProducts: [],
    saleProducts: [],
  });

  useEffect(() => {
    if (initialData && initialData.productCount > 0) return;
    fetch("/api/homepage")
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((d) => {
        if (d && !d.error) {
          setData(d);
        }
      })
      .catch(() => {});
  }, []);

  const displayCount = data.productCount > 0
    ? new Intl.NumberFormat("en-US").format(data.productCount)
    : "17,553";

  return (
    <div className="flex flex-col gap-0">
      <section className="relative h-[85vh] md:h-[90vh] min-h-[560px] flex items-end overflow-hidden -mx-4 md:-mx-8">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-editorial.jpg"
            alt="INTERTEXE — Luxury natural-fabric fashion"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        </div>
        <div
          className="relative z-10 px-6 md:px-12 pb-14 md:pb-20 max-w-xl flex flex-col"
          style={{ paddingBottom: "max(3.5rem, calc(env(safe-area-inset-bottom, 0px) + 3rem))" }}
        >
          <h2
            className="text-[32px] leading-[1.08] md:text-[56px] font-serif text-white mb-3 md:mb-5"
            data-testid="text-hero-headline"
          >
            The fabric<br />makes the piece
          </h2>
          <p
            className="text-[13px] md:text-[17px] text-white/65 mb-7 md:mb-9 font-light leading-relaxed max-w-sm"
            data-testid="text-hero-subtext"
          >
            {displayCount} verified pieces in silk, cashmere, linen &amp; wool — every composition checked, every brand vetted.
          </p>
          <Link
            href="/shop"
            className="border border-white text-white px-7 py-3.5 md:px-9 md:py-4 uppercase tracking-[0.18em] text-[11px] md:text-xs font-medium hover:bg-white hover:text-black transition-all duration-300 flex items-center gap-2 w-fit active:scale-[0.97]"
            data-testid="button-shop-now"
          >
            Shop now
          </Link>
        </div>
      </section>

      {data.newInProducts.length > 0 && (
        <section className="py-12 md:py-20">
          <HorizontalProductScroll
            products={data.newInProducts}
            title="New In"
            subtitle={`${displayCount} verified pieces`}
            linkHref="/shop"
            linkText="Shop New In"
            eager
          />
        </section>
      )}

      {data.saleProducts && data.saleProducts.length > 0 && (
        <section className="py-12 md:py-20 border-t border-border/30">
          <div className="flex flex-col gap-6 md:gap-8">
            <div className="flex items-center justify-between">
              <Link href="/sale" className="flex items-center gap-3 group" data-testid="link-the-edit-on-sale">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] md:text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    The edit
                  </span>
                  <h2 className="text-[20px] md:text-[28px] font-serif group-hover:text-muted-foreground transition-colors leading-tight">
                    On Sale
                  </h2>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
            <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-8 md:px-8 pb-2">
              {data.saleProducts.map((product: any) => {
                const originalNum = product.originalPrice ? parseFloat(product.originalPrice.replace(/[^0-9.]/g, "")) : 0;
                const currentNum = product.price ? parseFloat(product.price.replace(/[^0-9.]/g, "")) : 0;
                const discountPct = originalNum > 0 ? Math.round((1 - currentNum / originalNum) * 100) : 0;
                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className="group flex-shrink-0 w-[160px] md:w-[220px] flex flex-col cursor-pointer"
                    data-testid={`product-sale-${product.id}`}
                  >
                    <div className="aspect-[3/4] bg-[#f5f5f5] relative overflow-hidden">
                      {product.imageUrl ? (
                        <img src={optimizeImageUrl(product.imageUrl, 440)} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading="lazy" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-neutral-300" />
                        </div>
                      )}
                      {discountPct > 0 && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="bg-black/80 text-white px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
                            {discountPct}% off
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 pt-2.5">
                      <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em]">
                        {product.brandName}
                      </span>
                      <h3 className="text-[11px] md:text-[12px] leading-snug truncate text-muted-foreground">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] md:text-[12px] font-medium">{product.price}</span>
                        {product.originalPrice && (
                          <span className="text-[10px] md:text-[11px] text-muted-foreground line-through">{product.originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Link
              href="/sale"
              className="self-start text-[10px] md:text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              data-testid="link-shop-sale"
            >
              Shop All Sale <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </section>
      )}

      <section className="py-12 md:py-20 border-t border-border/30">
        <div className="flex justify-between items-end mb-10 md:mb-14">
          <div>
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1.5">
              Curated selection
            </p>
            <h2 className="text-[22px] md:text-[32px] font-serif leading-tight">The Brands We Love</h2>
          </div>
          <Link
            href="/designers"
            className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            data-testid="link-view-all-designers"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <BrandGrid designers={data.curatedDesigners} productCounts={data.productCountByBrand} />
      </section>

      {data.cashmereProducts.length > 0 && (
        <section className="py-8 md:py-14 border-t border-border/30">
          <HorizontalProductScroll
            products={data.cashmereProducts}
            title="The Cashmere Edit"
            subtitle="Pure luxury, verified"
            linkHref="/materials/cashmere"
            linkText="Shop all cashmere"
          />
        </section>
      )}

      <section className="-mx-4 md:-mx-8 grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-border/20">
        <Link
          href="/materials/silk-tops"
          className="group relative aspect-[4/5] md:aspect-[3/4] overflow-hidden flex items-end bg-[#f5f5f5]"
          data-testid="link-edit-silk"
        >
          <div className="absolute inset-0">
            {data.silkProducts[0]?.imageUrl && (
              <img
                src={optimizeImageUrl(data.silkProducts[0].imageUrl, 800)}
                alt="The Silk Edit"
                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000 ease-out"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
          <div className="relative z-10 p-7 md:p-10 flex flex-col gap-1.5">
            <span className="text-white/50 text-[9px] md:text-[10px] uppercase tracking-[0.25em]">In focus</span>
            <h3 className="text-white text-[22px] md:text-3xl font-serif leading-tight">The Silk Edit</h3>
            <p className="text-white/60 text-[11px] md:text-sm font-light">Blouses, dresses &amp; camisoles in pure silk</p>
            <span className="text-white/80 text-[10px] uppercase tracking-[0.15em] mt-3 flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
              Discover <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
        <Link
          href="/materials/linen-dresses"
          className="group relative aspect-[4/5] md:aspect-[3/4] overflow-hidden flex items-end bg-[#f5f5f5]"
          data-testid="link-edit-linen"
        >
          <div className="absolute inset-0">
            {data.linenProducts[0]?.imageUrl && (
              <img
                src={optimizeImageUrl(data.linenProducts[0].imageUrl, 800)}
                alt="Linen for Every Day"
                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000 ease-out"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
          <div className="relative z-10 p-7 md:p-10 flex flex-col gap-1.5">
            <span className="text-white/50 text-[9px] md:text-[10px] uppercase tracking-[0.25em]">The edit</span>
            <h3 className="text-white text-[22px] md:text-3xl font-serif leading-tight">Linen for Every Day</h3>
            <p className="text-white/60 text-[11px] md:text-sm font-light">Dresses, tops &amp; suiting in natural linen</p>
            <span className="text-white/80 text-[10px] uppercase tracking-[0.15em] mt-3 flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
              Discover <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </section>

      {data.silkProducts.length > 0 && (
        <section className="py-8 md:py-14">
          <HorizontalProductScroll
            products={data.silkProducts}
            title="Silk Essentials"
            subtitle="Effortless elegance"
            linkHref="/materials/silk"
            linkText="Shop all silk"
          />
        </section>
      )}

      <section className="border-t border-b border-border/20 -mx-4 md:-mx-8 px-4 md:px-8 bg-[#F7F6F3]">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/20">
          <div className="py-10 md:py-14 flex flex-col items-center text-center gap-1.5">
            <span className="text-[28px] md:text-[42px] font-serif leading-none">{data.designers.length > 0 ? `${new Intl.NumberFormat("en-US").format(data.designers.length)}+` : "100+"}</span>
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Brands vetted
            </span>
          </div>
          <div className="py-10 md:py-14 flex flex-col items-center text-center gap-1.5">
            <span className="text-[28px] md:text-[42px] font-serif leading-none">{displayCount}</span>
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Verified pieces
            </span>
          </div>
          <div className="py-10 md:py-14 flex flex-col items-center text-center gap-1.5">
            <span className="text-[28px] md:text-[42px] font-serif leading-none">5</span>
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Material guides
            </span>
          </div>
          <div className="py-10 md:py-14 flex flex-col items-center text-center gap-1.5">
            <span className="text-[28px] md:text-[42px] font-serif leading-none">100%</span>
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Composition verified
            </span>
          </div>
        </div>
      </section>

      <section className="text-center py-16 md:py-28 max-w-xl mx-auto flex flex-col items-center gap-5 md:gap-7">
        <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Personalized for you
        </p>
        <h2 className="text-[24px] md:text-[40px] font-serif leading-[1.15]">Find your fabric persona</h2>
        <p className="text-muted-foreground text-[13px] md:text-[15px] max-w-md leading-relaxed font-light">
          Take our 2-minute quiz. We&apos;ll match you with your fabric identity and recommend the designers you&apos;ll love.
        </p>
        <Link
          href="/quiz"
          className="border border-foreground text-foreground px-9 py-3.5 uppercase tracking-[0.18em] text-[11px] md:text-xs font-medium hover:bg-foreground hover:text-background transition-all duration-300 mt-2 active:scale-[0.97]"
          data-testid="button-cta-quiz"
        >
          Take the quiz
        </Link>
      </section>

    </div>
  );
}
