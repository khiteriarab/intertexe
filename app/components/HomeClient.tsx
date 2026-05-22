"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ProductLink } from "./ProductLink";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag, X } from "lucide-react";
import { getQualityTier } from "../../lib/quality-tiers";
import { getBrandHeroImage } from "../../lib/brand-hero-images";
import { formatDisplayPrice, formatDisplayOriginalPrice } from "../../lib/format-display-price";
import { HOMEPAGE_RAIL_LABELS } from "../../lib/merch-nav";
import { CURATED_BRAND_SLUGS } from "../../lib/homepage-constants";
import { BRAND_WE_LOVE_IMAGES, EDITORIAL_HERO } from "../../lib/editorial-assets";
import { COLLECTION_SECTIONS } from "../../lib/site-architecture";

function AppDownloadBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const hidden = localStorage.getItem("app-banner-dismissed");
    if (!hidden) setDismissed(false);
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("app-banner-dismissed", "1");
  };

  return (
    <div className="bg-[#111] text-white flex items-center gap-3 px-4 py-2.5 -mx-4 md:-mx-8" data-testid="banner-app-download">
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-0.5 text-white/50 hover:text-white transition-colors"
        aria-label="Dismiss"
        data-testid="button-dismiss-banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="w-9 h-9 bg-white flex items-center justify-center flex-shrink-0">
        <span className="text-[#111] text-[5px] font-semibold tracking-[0.12em] uppercase leading-tight text-center">INTER<br />TEXE</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] leading-tight"><span className="font-semibold">Enjoy 10% off</span></p>
        <p className="text-[10px] text-white/60 leading-tight mt-0.5">Get 10% off your first app order on select items with code <span className="font-semibold">APP10</span>. <span className="underline">T&amp;Cs apply</span>.</p>
      </div>
      <a
        href="#"
        className="flex-shrink-0 border border-white text-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] hover:bg-white hover:text-black transition-colors"
        data-testid="link-app-download"
      >
        Download
      </a>
    </div>
  );
}

function optimizeImageUrl(url: string, width: number): string {
  if (!url) return url;
  if (url.includes("cdn.shopify.com")) {
    const separator = url.includes("?") ? "&" : "?";
    return url + separator + "width=" + width;
  }
  return url;
}

function ProductCard({
  product,
  eager,
  variant = "default",
}: {
  product: any;
  eager?: boolean;
  variant?: "default" | "sale";
}) {
  const name = product.name || "";
  const brandName = product.brandName || "";
  const imageUrl = product.imageUrl || "";
  const priceShown = formatDisplayPrice(product);
  const originalShown = formatDisplayOriginalPrice(product);
  const composition = product.composition;
  const originalNum = product.originalPrice ? parseFloat(String(product.originalPrice).replace(/[^0-9.]/g, "")) : 0;
  const currentNum = product.price ? parseFloat(String(product.price).replace(/[^0-9.]/g, "")) : 0;
  const discountPct = originalNum > 0 ? Math.round((1 - currentNum / originalNum) * 100) : 0;
  return (
    <ProductLink
      href={`/product/${product.id}`}
      className="group flex-shrink-0 w-[155px] md:w-[220px] flex flex-col cursor-pointer"
      data-testid={`product-home-${product.id}`}
    >
      <div className="aspect-[3/4] bg-[#f5f4f2] relative overflow-hidden">
        {imageUrl ? (
          <img
            src={optimizeImageUrl(imageUrl, 480)}
            alt={name}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out pointer-events-none select-none"
            loading={eager ? "eager" : "lazy"}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-neutral-300" />
          </div>
        )}
        {composition && (
          <div className="absolute bottom-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="bg-black/70 text-white px-2 py-0.5 text-[8px] md:text-[9px] uppercase tracking-[0.05em] font-medium backdrop-blur-sm line-clamp-1 max-w-[140px] md:max-w-[200px]">
              {composition}
            </span>
          </div>
        )}
        {variant === "sale" && discountPct > 0 && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-black text-white px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium">
              {discountPct}% off
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col pt-2.5">
        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em]">
          {brandName}
        </span>
        <h3 className="text-[11px] md:text-[12px] leading-snug truncate text-neutral-500 mt-px">
          {name}
        </h3>
        <span className="text-[11px] md:text-[12px] mt-0.5">{priceShown}</span>
        {variant === "sale" && product.originalPrice && (
          <span className="text-[10px] text-neutral-400 line-through">{originalShown}</span>
        )}
      </div>
    </ProductLink>
  );
}

export function HorizontalProductScroll({
  products,
  title,
  subtitle,
  linkHref,
  linkText,
  catalogHref,
  catalogLinkText,
  eager,
}: {
  products: any[];
  title: string;
  subtitle?: string;
  linkHref: string;
  linkText: string;
  /** Optional second link when this rail is a small curated edit, not the full catalog. */
  catalogHref?: string;
  catalogLinkText?: string;
  eager?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -420 : 420;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const hasItems = products && products.length > 0;

  return (
    <div className="flex flex-col gap-5 md:gap-7">
      <div className="flex items-end justify-between">
        <Link
          href={linkHref}
          className="flex items-center gap-3 group"
          data-testid={`link-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div className="flex flex-col gap-0.5">
            {subtitle && (
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-neutral-400">
                {subtitle}
              </span>
            )}
            <h2 className="text-[20px] md:text-[28px] font-serif group-hover:text-neutral-400 transition-colors duration-300 leading-tight">
              {title}
            </h2>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-9 h-9 border border-neutral-200 flex items-center justify-center hover:border-neutral-400 transition-colors duration-200"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-9 h-9 border border-neutral-200 flex items-center justify-center hover:border-neutral-400 transition-colors duration-200"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="product-rail-scroll flex gap-2.5 md:gap-4 scrollbar-hide -mx-4 px-4 md:-mx-8 md:px-8 pb-1 min-h-[200px]"
      >
        {hasItems ? (
          products.map((product: any, i: number) => (
            <ProductCard key={product.id} product={product} eager={eager && i < 4} />
          ))
        ) : (
          <p className="text-[11px] md:text-[12px] text-neutral-400 max-w-md leading-relaxed">
            These pieces took longer than usual to load. Try again shortly or browse the shop page for the full grid.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 items-start">
        <Link
          href={linkHref}
          className="text-[10px] md:text-xs uppercase tracking-[0.15em] text-neutral-400 hover:text-neutral-800 transition-colors duration-300 flex items-center gap-2"
          data-testid={`link-shop-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {linkText} <ArrowRight className="w-3 h-3" />
        </Link>
        {catalogHref && catalogLinkText && (
          <Link
            href={catalogHref}
            className="text-[10px] md:text-xs uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-800 transition-colors duration-300 flex items-center gap-2"
            data-testid={`link-catalog-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {catalogLinkText} <ArrowRight className="w-3 h-3" />
          </Link>
        )}
        {hasItems && (
          <p className="text-[10px] text-neutral-400 max-w-md leading-relaxed">
            {products.length} pieces in this edit — not the full catalog.
          </p>
        )}
      </div>
    </div>
  );
}

function SaleHomeRail({ products }: { products?: any[] }) {
  return (
    <section className="py-10 md:py-20 border-t border-neutral-200/60">
      <div className="flex flex-col gap-5 md:gap-7">
        <div className="flex items-end justify-between">
          <Link href="/sale" className="flex items-center gap-3 group" data-testid="link-the-edit-on-sale">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-neutral-400">
                The edit
              </span>
              <h2 className="text-[20px] md:text-[28px] font-serif group-hover:text-neutral-400 transition-colors duration-300 leading-tight">
                {HOMEPAGE_RAIL_LABELS.saleProducts.title}
              </h2>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
        <div className="product-rail-scroll flex gap-2.5 md:gap-4 scrollbar-hide -mx-4 px-4 md:-mx-8 md:px-8 pb-1 min-h-[200px]">
          {products?.length ? (
            products.map((product: any) => (
              <ProductCard key={product.id} product={product} variant="sale" />
            ))
          ) : (
            <p className="text-[11px] md:text-[12px] text-neutral-400 max-w-md leading-relaxed">
              Sale spotlight is refreshing. Browse the sale page for the full markdown grid.
            </p>
          )}
        </div>
        <Link
          href="/sale"
          className="self-start text-[10px] md:text-xs uppercase tracking-[0.18em] text-neutral-400 hover:text-neutral-800 transition-colors duration-300 flex items-center gap-2"
          data-testid="link-shop-sale"
        >
          Shop all sale <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </section>
  );
}

function BrandCard({ designer, count }: { designer: any; count: number }) {
  const [failed, setFailed] = useState(false);
  const heroUrl =
    BRAND_WE_LOVE_IMAGES[designer.slug as keyof typeof BRAND_WE_LOVE_IMAGES] ||
    getBrandHeroImage(designer.name);
  const productImageUrl = designer.heroImageUrl || "";
  const imageUrl = !failed ? (heroUrl || productImageUrl) : "";
  const tier = getQualityTier(designer.naturalFiberPercent);

  return (
    <Link
      href={`/designers/${designer.slug}`}
      className="group flex flex-col gap-3 active:scale-[0.98] transition-transform touch-manipulation"
      data-testid={`card-designer-${designer.id}`}
    >
      <div className={`aspect-[3/4] w-full overflow-hidden relative ${imageUrl ? "bg-neutral-100" : "bg-[#f0ece6]"}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${designer.name} editorial`}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            loading="eager"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <span className="font-serif text-lg md:text-xl text-neutral-300 tracking-[0.15em] uppercase text-center leading-relaxed">
              {designer.name}
            </span>
          </div>
        )}
        {count > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="flex items-center gap-1 bg-white/90 text-neutral-800 px-2.5 py-1 text-[8px] uppercase tracking-[0.12em] font-medium backdrop-blur-sm">
              <ShoppingBag className="w-2.5 h-2.5" />
              {count}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[11px] md:text-[13px] font-semibold uppercase tracking-[0.08em] group-hover:text-neutral-400 transition-colors duration-300">
          {designer.name}
        </h3>
        <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-neutral-400">
          {tier.label}
        </p>
      </div>
    </Link>
  );
}

export function BrandGrid({
  designers,
  productCounts,
}: {
  designers: any[];
  productCounts: Record<string, number>;
}) {
  if (!designers || designers.length === 0) {
    return (
      <div className="rounded-sm border border-neutral-200/80 bg-neutral-50/50 px-4 py-8 text-center">
        <p className="text-[12px] text-neutral-500 max-w-md mx-auto leading-relaxed">
          Designer highlights are refreshing. Explore the{" "}
          <Link href="/designers" className="underline text-neutral-800">
            brand directory
          </Link>{" "}
          for every label we track.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {designers.map((designer: any) => {
        const count = productCounts[designer.slug] || 0;
        return <BrandCard key={designer.id} designer={designer} count={count} />;
      })}
    </div>
  );
}

function EditorialPanel({
  href,
  imageUrl,
  label,
  title,
  subtitle,
  testId,
}: {
  href: string;
  imageUrl: string;
  label: string;
  title: string;
  subtitle: string;
  testId: string;
}) {
  return (
    <Link
      href={href}
      className="group relative w-full overflow-hidden flex items-end bg-[#f2f1ef] aspect-[3/4] md:aspect-[16/9] touch-manipulation"
      data-testid={testId}
    >
      <div className="absolute inset-0">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-[1200ms] ease-out"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>
      <div className="relative z-10 p-7 pb-10 md:p-14 md:pb-16 flex flex-col gap-2">
        <span className="text-white/45 text-[9px] md:text-[10px] uppercase tracking-[0.35em] font-light">{label}</span>
        <h3 className="text-white text-[28px] md:text-[44px] font-serif leading-[1.08] max-w-md">{title}</h3>
        <p className="text-white/55 text-[12px] md:text-[15px] font-light max-w-sm leading-relaxed mt-1">{subtitle}</p>
        <span className="text-white/70 text-[10px] uppercase tracking-[0.2em] mt-4 md:mt-5 flex items-center gap-2 group-hover:gap-3 group-hover:text-white transition-all duration-300">
          Discover <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}

interface HomePageData {
  designers: any[];
  productCount: number;
  brandCount: number;
  productCountByBrand: Record<string, number>;
  curatedDesigners: any[];
  newInProducts: any[];
  vacationProducts: any[];
  eveningProducts: any[];
  tailoringProducts: any[];
  summerInCityProducts: any[];
  whiteEditProducts: any[];
  saleProducts: any[];
}

const COLLECTION_PRODUCTS_KEY: Record<string, keyof HomePageData> = {
  vacation: "vacationProducts",
  evening: "eveningProducts",
  tailoring: "tailoringProducts",
  "summer-in-the-city": "summerInCityProducts",
  "white-edit": "whiteEditProducts",
};

function editorialHeroForSlug(slug: string): string {
  const key = slug as keyof typeof EDITORIAL_HERO;
  return EDITORIAL_HERO[key] ?? EDITORIAL_HERO.newIn;
}

function BrandsPairRow({
  designers,
  productCounts,
}: {
  designers: any[];
  productCounts: Record<string, number>;
}) {
  if (!designers.length) return null;
  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6">
      {designers.map((designer: any) => (
        <BrandCard
          key={designer.id}
          designer={designer}
          count={productCounts[designer.slug] || 0}
        />
      ))}
    </div>
  );
}

export function HomePageContent({ initialData }: { initialData?: HomePageData }) {
  const [data, setData] = useState<HomePageData>(initialData || {
    designers: [],
    productCount: 0,
    brandCount: 0,
    productCountByBrand: {},
    curatedDesigners: [],
    newInProducts: [],
    vacationProducts: [],
    eveningProducts: [],
    tailoringProducts: [],
    summerInCityProducts: [],
    whiteEditProducts: [],
    saleProducts: [],
  });

  useEffect(() => {
    /** Server already rendered with `getHomePageData` — avoid doubling Supabase work on mount. */
    if (initialData !== undefined) return;
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
  }, [initialData]);

  const displayCount =
    data.productCount > 0
      ? new Intl.NumberFormat("en-US").format(data.productCount)
      : "24,000";
  const displayBrands =
    data.brandCount > 0
      ? `${new Intl.NumberFormat("en-US").format(data.brandCount)}+`
      : "99+";

  const curatedOrdered = CURATED_BRAND_SLUGS.map((slug) =>
    data.curatedDesigners.find((d: { slug?: string }) => d.slug === slug)
  ).filter(Boolean) as any[];

  const brandPairs: any[][] = [];
  for (let i = 0; i < curatedOrdered.length; i += 2) {
    brandPairs.push(curatedOrdered.slice(i, i + 2));
  }

  return (
    <div className="flex flex-col">

      <AppDownloadBanner />

      <section className="relative h-[88vh] md:h-[92vh] min-h-[600px] flex items-end overflow-hidden -mx-4 md:-mx-8">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-editorial-v8.png"
            alt="INTERTEXE — Luxury natural-fabric fashion"
            className="w-full h-full object-cover object-[center_25%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        </div>
        <div
          className="relative z-10 px-6 md:px-14 pb-16 md:pb-24 max-w-xl flex flex-col"
          style={{ paddingBottom: "max(4rem, calc(env(safe-area-inset-bottom, 0px) + 3.5rem))" }}
        >
          <h2
            className="text-[34px] leading-[1.06] md:text-[60px] font-serif text-white mb-4 md:mb-6"
            data-testid="text-hero-headline"
          >
            What to<br />wear now
          </h2>
          <p
            className="text-[12px] md:text-[15px] text-white/65 mb-8 md:mb-10 font-light leading-relaxed max-w-sm"
            data-testid="text-hero-subtext"
          >
            {displayCount} pieces in silk, cashmere, linen &amp; wool — curated natural-fiber fashion.
          </p>
          <Link
            href="/shop"
            className="bg-white text-black px-10 py-3.5 md:px-12 md:py-4 uppercase tracking-[0.2em] text-[10px] md:text-[11px] font-medium hover:bg-white/90 transition-all duration-500 flex items-center gap-2.5 w-fit active:scale-[0.97]"
            data-testid="button-shop-now"
          >
            Shop now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      <section className="py-10 md:py-20">
        <HorizontalProductScroll
          products={data.newInProducts}
          title={HOMEPAGE_RAIL_LABELS.newInProducts.title}
          subtitle={HOMEPAGE_RAIL_LABELS.newInProducts.subtitle}
          linkHref="/shop?sort=new"
          linkText="Shop New In"
          eager
        />
      </section>

      {COLLECTION_SECTIONS.map((collection, index) => {
        const productsKey = COLLECTION_PRODUCTS_KEY[collection.slug];
        const products = (data[productsKey] as any[]) || [];
        const labels =
          HOMEPAGE_RAIL_LABELS[`${productsKey}` as keyof typeof HOMEPAGE_RAIL_LABELS] ??
          { title: collection.label, subtitle: collection.subtitle };
        const pair = brandPairs[index % brandPairs.length];

        return (
          <div key={collection.slug}>
            <section className="-mx-4 md:-mx-8">
              <EditorialPanel
                href={collection.href}
                imageUrl={editorialHeroForSlug(collection.slug)}
                label={collection.kicker}
                title={collection.label}
                subtitle={collection.subtitle}
                testId={`link-collection-${collection.slug}`}
              />
            </section>

            <section className="py-10 md:py-20 border-t border-neutral-200/60">
              <HorizontalProductScroll
                products={products}
                title={labels.title}
                subtitle={labels.subtitle}
                linkHref={collection.href}
                linkText={`Shop ${collection.label}`}
              />
            </section>

            {pair && pair.length > 0 && (
              <section className="py-10 md:py-16 border-t border-neutral-200/60">
                <div className="flex justify-between items-end mb-6 md:mb-8">
                  <p className="text-[9px] md:text-[10px] uppercase tracking-[0.35em] text-neutral-400">
                    Brands we love
                  </p>
                  <Link
                    href="/designers"
                    className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-neutral-800 transition-colors duration-300 flex items-center gap-2"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <BrandsPairRow designers={pair} productCounts={data.productCountByBrand} />
              </section>
            )}
          </div>
        );
      })}

      <SaleHomeRail products={data.saleProducts} />

      <section className="-mx-4 md:-mx-8 bg-[#f8f7f5]">
        <div className="max-w-5xl mx-auto py-14 md:py-24 px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-neutral-300/40">
            <div className="flex flex-col items-center text-center gap-2 md:px-8">
              <span className="text-[32px] md:text-[48px] font-serif leading-none tracking-tight">{displayBrands}</span>
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-light">
                Brands vetted
              </span>
            </div>
            <div className="flex flex-col items-center text-center gap-2 md:px-8">
              <span className="text-[32px] md:text-[48px] font-serif leading-none tracking-tight">{displayCount}</span>
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-light">
                Verified pieces
              </span>
            </div>
            <div className="flex flex-col items-center text-center gap-2 md:px-8">
              <span className="text-[32px] md:text-[48px] font-serif leading-none tracking-tight">95%+</span>
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-light">
                Natural fibers
              </span>
            </div>
            <div className="flex flex-col items-center text-center gap-2 md:px-8">
              <span className="text-[32px] md:text-[48px] font-serif leading-none tracking-tight">100%</span>
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-light">
                Composition verified
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-28 flex flex-col items-center text-center">
        <p className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-neutral-400 mb-5 md:mb-7">
          Personalized for you
        </p>
        <h2 className="text-[28px] md:text-[44px] font-serif leading-[1.1] mb-5 md:mb-7 max-w-lg">Find your fabric persona</h2>
        <p className="text-neutral-500 text-[13px] md:text-[16px] max-w-md leading-relaxed font-light mb-8 md:mb-12">
          Take our 2-minute quiz. We&apos;ll match you with your fabric identity and recommend the designers you&apos;ll love.
        </p>
        <Link
          href="/quiz"
          className="border border-neutral-800 text-neutral-800 px-10 py-4 uppercase tracking-[0.2em] text-[10px] md:text-[11px] font-light hover:bg-neutral-800 hover:text-white transition-all duration-500 active:scale-[0.97]"
          data-testid="button-cta-quiz"
        >
          Take the quiz
        </Link>
      </section>

    </div>
  );
}
