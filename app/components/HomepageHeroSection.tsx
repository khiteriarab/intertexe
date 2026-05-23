"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductLink } from "./ProductLink";
import { CatalogProductImage } from "./CatalogProductImage";
import { HOMEPAGE_HERO_IMAGE } from "../../lib/editorial-assets";

function optimizeImageUrl(url: string, width: number): string {
  if (!url) return url;
  if (url.includes("cdn.shopify.com")) {
    const separator = url.includes("?") ? "&" : "?";
    return url + separator + "width=" + width + "&format=webp";
  }
  return url;
}

/** Portrait campaign hero — full-bleed on mobile; split with shop grid on desktop. */
export function HomepageHeroSection({
  displayCount,
  products,
}: {
  displayCount: string;
  products: any[];
}) {
  const heroProducts = (products || []).slice(0, 4);

  return (
    <>
      <section className="lg:hidden relative overflow-hidden w-full -mx-4 md:-mx-8" data-testid="homepage-hero-mobile">
        <div className="homepage-hero-frame-mobile relative w-full overflow-hidden bg-[#eae8e4]">
          <img
            src={HOMEPAGE_HERO_IMAGE}
            alt="INTERTEXE — Luxury natural-fabric fashion"
            className="homepage-hero-img absolute inset-0 w-full h-full object-cover object-[center_42%]"
            fetchPriority="high"
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent pointer-events-none" />
        <div
          className="absolute inset-0 z-10 flex flex-col justify-end px-6 pb-16 max-w-xl"
          style={{ paddingBottom: "max(4rem, calc(env(safe-area-inset-bottom, 0px) + 3.5rem))" }}
        >
          <h2 className="text-[34px] leading-[1.06] font-serif text-white mb-4" data-testid="text-hero-headline">
            What to<br />
            wear now
          </h2>
          <p className="text-[12px] text-white/70 mb-8 font-light leading-relaxed max-w-sm" data-testid="text-hero-subtext">
            {displayCount} pieces in silk, cashmere, linen &amp; wool — curated natural-fiber fashion.
          </p>
          <Link
            href="/shop"
            className="bg-white text-black px-10 py-3.5 uppercase tracking-[0.2em] text-[10px] font-medium hover:bg-white/90 transition-all w-fit flex items-center gap-2.5"
            data-testid="button-shop-now"
          >
            Shop now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      <section
        className="hidden lg:grid lg:grid-cols-2 -mx-8 min-h-[min(82vh,780px)] border-b border-neutral-200/60"
        data-testid="homepage-hero-desktop"
      >
        <div className="relative overflow-hidden bg-[#eae8e4] min-h-[min(82vh,780px)]">
          <img
            src={HOMEPAGE_HERO_IMAGE}
            alt="INTERTEXE editorial"
            className="absolute inset-0 w-full h-full object-cover object-[center_38%]"
            fetchPriority="high"
            draggable={false}
          />
        </div>

        <div className="flex flex-col justify-center px-10 xl:px-14 py-12 bg-[#FAFAF8]">
          <p className="text-[10px] uppercase tracking-[0.32em] text-neutral-400 mb-3">The edit</p>
          <h2 className="text-[44px] xl:text-[52px] font-serif leading-[1.05] mb-4 text-foreground" data-testid="text-hero-headline-desktop">
            What to wear now
          </h2>
          <p className="text-[14px] text-neutral-600 font-light leading-relaxed max-w-md mb-8" data-testid="text-hero-subtext-desktop">
            {displayCount} pieces in silk, cashmere, linen &amp; wool — curated natural-fiber fashion.
          </p>

          {heroProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 xl:gap-4 mb-8">
              {heroProducts.map((product: any, i: number) => (
                <ProductLink key={product.id} href={`/product/${product.id}`} className="group flex flex-col">
                  {product.imageUrl ? (
                    <CatalogProductImage
                      src={optimizeImageUrl(product.imageUrl, 320)}
                      alt={product.name || ""}
                      name={product.name}
                      eager={i < 2}
                    />
                  ) : (
                    <div className="aspect-[3/4] bg-neutral-100" />
                  )}
                  <span className="text-[9px] uppercase tracking-[0.08em] text-neutral-400 mt-2 truncate">
                    {product.brandName || product.brand_name}
                  </span>
                  <span className="text-[11px] text-neutral-600 truncate">{product.name}</span>
                </ProductLink>
              ))}
            </div>
          ) : null}

          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-foreground text-background px-10 py-3.5 uppercase tracking-[0.2em] text-[10px] font-medium hover:bg-foreground/90 transition-colors w-fit"
            data-testid="button-shop-now-desktop"
          >
            Shop now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
