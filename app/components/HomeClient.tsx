"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ProductLink } from "./ProductLink";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag, X } from "lucide-react";
import { getBrandHeroImage } from "../../lib/brand-hero-images";
import { formatDisplayPrice, formatDisplayOriginalPrice } from "../../lib/format-display-price";
import { CURATED_BRAND_SLUGS } from "../../lib/homepage-constants";
import { editorialHeroForSlug, HOMEPAGE_HERO_IMAGE } from "../../lib/editorial-assets";
import { COLLECTION_SECTIONS } from "../../lib/site-architecture";
import {
  HORIZONTAL_RAIL_BLEED_CLASS,
  HORIZONTAL_RAIL_BLEED_WRAPPER_CLASS,
  HORIZONTAL_RAIL_INSET_CLASS,
  HORIZONTAL_RAIL_PRODUCT_CARD_CLASS,
} from "../../lib/horizontal-rail";
import { formatProductCountLabel } from "../../lib/catalog-stats-labels";
import { EditorialHeroImage } from "./EditorialHeroImage";
import { BrandEditorialImage } from "./BrandEditorialImage";
import { HomepageHeroSection } from "./HomepageHeroSection";
import { NewInHomeRail } from "./NewInHomeRail";
import { SaleHomeRail } from "./SaleHomeRail";
import { ShopTheEditCarousel } from "./ShopTheEditCarousel";
import { CatalogProductImage } from "./CatalogProductImage";
import Image from "next/image";
import { cfHomepageRail } from "../../lib/cloudflare-images";
import { CATALOG_STATS } from "../../lib/catalog-stats";

const SIGNUP_URL = "/signup";
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";

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
    <div
      className="w-full shrink-0 bg-[#111] text-white flex flex-wrap items-center gap-3 px-4 md:px-6 py-2.5"
      data-testid="banner-app-download"
    >
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-0.5 text-white/50 hover:text-white transition-colors"
        aria-label="Dismiss"
        data-testid="button-dismiss-banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <Image
        src="/app-icon.png"
        alt="Intertexe app"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-[9px] object-cover"
        data-testid="img-app-banner-icon"
      />
      <p className="flex-1 min-w-0 text-[11px] md:text-[12px] leading-snug font-medium">
        Get early access to the Intertexe app
      </p>
      <Link
        href={SIGNUP_URL}
        className="flex-shrink-0 border border-white text-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] hover:bg-white hover:text-black transition-colors"
        data-testid="link-app-download"
      >
        Get Early Access
      </Link>
    </div>
  );
}

function optimizeImageUrl(url: string, width: number): string {
  return cfHomepageRail(url);
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
      <div className="relative">
        {imageUrl ? (
          <CatalogProductImage
            src={optimizeImageUrl(imageUrl, 480)}
            alt={name}
            category={product.category}
            name={name}
            eager={eager}
            sizes="(min-width: 768px) 220px, 155px"
          />
        ) : (
          <div className="aspect-[3/4] bg-[#1C2B2A] flex items-center justify-center">
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

const HOMEPAGE_RAIL_LIMIT_MOBILE = 8;
const HOMEPAGE_RAIL_LIMIT_DESKTOP = 16;

function useIsDesktopRail() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function HorizontalProductScroll({
  products,
  title,
  subtitle,
  linkHref,
  linkText,
  catalogHref,
  catalogLinkText,
  collectionCtaOnly,
  eager,
  productCardVariant = "default",
  fullWidth = false,
  limit,
}: {
  products: any[];
  title: string;
  subtitle?: string;
  linkHref: string;
  linkText: string;
  /** Optional second link when this rail is a small curated edit, not the full catalog. */
  catalogHref?: string;
  catalogLinkText?: string;
  /** Collection rails: one link to the full collection (edit = catalog). */
  collectionCtaOnly?: boolean;
  eager?: boolean;
  productCardVariant?: "default" | "sale";
  fullWidth?: boolean;
  /** Max products in rail; defaults to 8 mobile / 16 desktop (lg+). */
  limit?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktopRail();
  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -420 : 420;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const railLimit =
    limit ?? (isDesktop ? HOMEPAGE_RAIL_LIMIT_DESKTOP : HOMEPAGE_RAIL_LIMIT_MOBILE);
  const railProducts = (products || []).slice(0, railLimit);
  const hasItems = railProducts.length > 0;

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

      {fullWidth ? (
        <div className={HORIZONTAL_RAIL_BLEED_WRAPPER_CLASS}>
          <div
            ref={scrollRef}
            className={`${HORIZONTAL_RAIL_BLEED_CLASS} gap-2.5 md:gap-4 min-h-[200px]`}
          >
            {hasItems ? (
              railProducts.map((product: any, i: number) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  eager={eager && i < 4}
                  variant={productCardVariant}
                />
              ))
            ) : (
              <p className="text-[11px] md:text-[12px] text-neutral-400 max-w-md leading-relaxed">
                These pieces took longer than usual to load. Try again shortly or browse the shop page for the full grid.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className={`${HORIZONTAL_RAIL_INSET_CLASS} gap-2.5 md:gap-4 min-h-[200px]`}
        >
          {hasItems ? (
            railProducts.map((product: any, i: number) => (
              <ProductCard
                key={product.id}
                product={product}
                eager={eager && i < 4}
                variant={productCardVariant}
              />
            ))
          ) : (
            <p className="text-[11px] md:text-[12px] text-neutral-400 max-w-md leading-relaxed">
              These pieces took longer than usual to load. Try again shortly or browse the shop page for the full grid.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 items-start">
        {collectionCtaOnly ? (
          <Link
            href={linkHref}
            className="text-[10px] md:text-xs uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-800 transition-colors duration-300 flex items-center gap-2"
            data-testid={`link-view-collection-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            View full collection <ArrowRight className="w-3 h-3" />
          </Link>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

function BrandCard({ designer }: { designer: any }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = !failed
    ? designer.heroImageUrl || getBrandHeroImage(designer.name) || ""
    : "";

  return (
    <Link
      href={`/designers/${designer.slug}`}
      className="group flex flex-col gap-3 active:scale-[0.98] transition-transform touch-manipulation flex-shrink-0 w-[42vw] sm:w-[30vw] md:w-auto snap-start"
      data-testid={`card-designer-${designer.id}`}
    >
      <div className={`w-full relative ${imageUrl && !failed ? "" : "aspect-[3/4] bg-[#f0ece6]"}`}>
        {imageUrl && !failed ? (
          <BrandEditorialImage
            src={imageUrl}
            alt={`${designer.name} editorial`}
            slug={designer.slug}
            onFailed={() => setFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <span className="font-serif text-lg md:text-xl text-neutral-300 tracking-[0.15em] uppercase text-center leading-relaxed">
              {designer.name}
            </span>
          </div>
        )}
      </div>
      <h3 className="text-[11px] md:text-[12px] font-medium uppercase tracking-[0.14em] text-neutral-800 group-hover:text-neutral-500 transition-colors duration-300">
        {designer.name}
      </h3>
    </Link>
  );
}

export function BrandGrid({ designers }: { designers: any[] }) {
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
    <>
      <div className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-1 px-1 pb-1">
        {designers.map((designer: any) => (
          <BrandCard key={designer.id} designer={designer} />
        ))}
      </div>
      <div className="hidden md:grid md:grid-cols-3 gap-5 lg:gap-7">
        {designers.map((designer: any) => (
          <BrandCard key={designer.id} designer={designer} />
        ))}
      </div>
    </>
  );
}

function EditorialPanel({
  href,
  imageUrl,
  label,
  title,
  subtitle,
  testId,
  slug,
}: {
  href: string;
  imageUrl: string;
  label: string;
  title: string;
  subtitle: string;
  testId: string;
  slug?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden touch-manipulation"
      data-testid={testId}
    >
      {imageUrl && (
        <EditorialHeroImage src={imageUrl} alt={title} variant="panel" hoverZoom slug={slug} title={title} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-7 pb-10 md:p-14 md:pb-16 gap-2">
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
  newInCount?: number;
  vacationProducts: any[];
  eveningProducts: any[];
  tailoringProducts: any[];
  summerInCityProducts: any[];
  whiteEditProducts: any[];
  saleProducts: any[];
}

const EDIT_CAROUSEL_SLIDES = COLLECTION_SECTIONS.map((collection) => ({
  slug: collection.slug,
  title: collection.label,
  kicker: collection.kicker,
  subtitle: collection.subtitle,
  href: collection.href,
  imageUrl: editorialHeroForSlug(collection.slug),
}));

export function HomePageContent({ initialData }: { initialData?: HomePageData }) {
  const [data, setData] = useState<HomePageData>(initialData || {
    designers: [],
    productCount: 0,
    brandCount: 0,
    productCountByBrand: {},
    curatedDesigners: [],
    newInProducts: [],
    newInCount: 0,
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
      ? formatProductCountLabel(data.productCount)
      : CATALOG_STATS.productCountFormatted;
  const displayBrands =
    data.brandCount > 0
      ? `${new Intl.NumberFormat("en-US").format(data.brandCount)}+`
      : CATALOG_STATS.brandCountFormatted;

  const curatedOrdered = CURATED_BRAND_SLUGS.map((slug) =>
    data.curatedDesigners.find((d: { slug?: string }) => d.slug === slug)
  ).filter(Boolean) as any[];

  return (
    <div className="flex flex-col w-full max-w-full">

      <div className="layout-bleed-full flex flex-col w-full overflow-hidden">
        <AppDownloadBanner />
        <HomepageHeroSection
          productCountLabel={displayCount}
          brandCountLabel={displayBrands.replace(/\+$/, "")}
        />
      </div>

      <NewInHomeRail products={data.newInProducts} newInCount={data.newInCount} />

      <section className="border-t border-neutral-200/60 layout-bleed-full" data-testid="homepage-shop-the-edit">
        <ShopTheEditCarousel slides={EDIT_CAROUSEL_SLIDES} />
      </section>

      {curatedOrdered.length > 0 && (
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
          <BrandGrid designers={curatedOrdered} />
        </section>
      )}

      <SaleHomeRail products={data.saleProducts} />

      <section className="-mx-4 md:-mx-8 bg-[#f8f7f5]">
        <div className="max-w-5xl mx-auto py-10 md:py-14 px-6 md:px-12">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs tracking-widest text-gray-500 uppercase">
            <span>{displayBrands} brands</span>
            <span aria-hidden>·</span>
            <span>{displayCount} pieces</span>
            <span aria-hidden>·</span>
            <span>95%+ natural fiber</span>
            <span aria-hidden>·</span>
            <span>Every composition verified</span>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-28 flex flex-col items-center text-center">
        <p className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-neutral-400 mb-5 md:mb-7">
          Personalized for you
        </p>
        <h2 className="text-[28px] md:text-[44px] font-serif leading-[1.1] mb-5 md:mb-7 max-w-lg">Find your fabric persona</h2>
        <p className="text-neutral-500 text-[13px] md:text-[16px] max-w-md leading-relaxed font-light mb-8 md:mb-12">
          Take our 1-minute quiz. We&apos;ll match you with your fabric identity and recommend the designers you&apos;ll love.
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
