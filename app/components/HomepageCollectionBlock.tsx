"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { EditorialHeroImage } from "./EditorialHeroImage";
import { editorialHeroForSlug } from "../../lib/editorial-assets";
import { canonicalProductId } from "../../lib/canonical-product-id";
import { cfHomepageRail } from "../../lib/cloudflare-images";
import type { CollectionSectionConfig } from "../../lib/site-architecture";
import {
  HORIZONTAL_RAIL_INSET_CLASS,
  HORIZONTAL_RAIL_PRODUCT_CARD_CLASS,
} from "../../lib/horizontal-rail";

function optimizeImageUrl(url: string, width: number): string {
  return cfHomepageRail(url);
}

function CollectionProductCard({ product, eager }: { product: any; eager?: boolean }) {
  const name = product.name || "";
  const brandName = product.brandName || product.brand_name || "";
  const imageUrl = product.imageUrl || product.image_url || "";
  const productHref = `/product/${canonicalProductId(product)}`;
  return (
    <Link
      href={productHref}
      className={`group flex flex-col ${HORIZONTAL_RAIL_PRODUCT_CARD_CLASS} w-[140px] xl:w-[155px]`}
      data-rail-card
      draggable={false}
    >
      <div className="aspect-[3/4] bg-[#f5f4f2] relative overflow-hidden">
        {imageUrl ? (
          <img
            src={optimizeImageUrl(imageUrl, 400)}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover object-[center_28%] group-hover:scale-[1.03] transition-transform duration-700"
            loading={eager ? "eager" : "lazy"}
            draggable={false}
          />
        ) : null}
      </div>
      <p className="text-xs tracking-widest uppercase text-neutral-500 mt-2 truncate">{brandName}</p>
    </Link>
  );
}

/**
 * Homepage collection edit — mobile: image then rail below.
 * Desktop: image left, product rail right (avoids ultra-wide crop on landscape heroes).
 */
/** When true, desktop layout is products left / editorial image right (Evening, Summer in the City). */
const SHOP_ON_LEFT_SLUGS = new Set(["evening", "summer-in-the-city"]);

export function HomepageCollectionBlock({
  collection,
  products,
  title,
  subtitle,
}: {
  collection: CollectionSectionConfig;
  products: any[];
  title: string;
  subtitle: string;
}) {
  const shopOnLeft = SHOP_ON_LEFT_SLUGS.has(collection.slug);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageUrl = editorialHeroForSlug(collection.slug);
  const hasItems = products.length > 0;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  const editorial = (
    <Link
      href={collection.href}
      className="group relative block w-full h-full min-h-[380px] lg:min-h-0 overflow-hidden touch-manipulation"
      data-testid={`link-collection-${collection.slug}`}
    >
      {imageUrl && (
        <EditorialHeroImage
          src={imageUrl}
          alt={collection.label}
          variant="collection"
          slug={collection.slug}
          title={collection.label}
          className="h-full min-h-[380px] lg:min-h-full lg:absolute lg:inset-0"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-7 md:p-10 gap-2">
        <span className="text-white/45 text-[9px] md:text-[10px] uppercase tracking-[0.35em] font-light">
          {collection.kicker}
        </span>
        <h3 className="text-white text-[28px] md:text-[36px] lg:text-[40px] font-serif leading-[1.08] max-w-md">
          {collection.label}
        </h3>
        <p className="text-white/55 text-[11px] md:text-[12px] font-light max-w-sm leading-relaxed mt-1 normal-case tracking-normal">
          {collection.subtitle}
        </p>
        <span className="text-white/70 text-[10px] uppercase tracking-[0.2em] mt-3 md:mt-4 flex items-center gap-2 group-hover:gap-3 group-hover:text-white transition-all duration-300">
          Discover <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );

  const shopRail = (
    <div className="flex flex-col justify-center h-full w-full py-10 lg:py-12 px-6 md:px-10 xl:px-12 bg-[#FAFAF8]">
      <h2 className="sr-only">{title}</h2>
      <p className="sr-only">{subtitle}</p>
      <div className="flex items-end justify-end gap-4 mb-6">
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="w-9 h-9 border border-neutral-200 flex items-center justify-center hover:border-neutral-400 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="w-9 h-9 border border-neutral-200 flex items-center justify-center hover:border-neutral-400 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`${HORIZONTAL_RAIL_INSET_CLASS} gap-3 min-h-[200px]`}
      >
        {hasItems ? (
          products.slice(0, 12).map((product: any, i: number) => (
            <CollectionProductCard key={product.id} product={product} eager={i < 4} />
          ))
        ) : (
          <p className="text-[11px] text-neutral-400 max-w-xs leading-relaxed">
            This edit is refreshing — view the full collection for the latest pieces.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <Link
          href={collection.href}
          className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-800 transition-colors flex items-center gap-2 w-fit"
        >
          View full collection <ArrowRight className="w-3 h-3" />
        </Link>
        <Link
          href="/shop"
          className="text-[10px] uppercase tracking-[0.15em] text-neutral-800 hover:text-neutral-500 transition-colors flex items-center gap-2 w-fit font-medium"
        >
          Shop all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );

  return (
    <div
      className="w-full max-w-none border-t border-neutral-200/60"
      data-testid={`homepage-collection-${collection.slug}`}
    >
      <section className="lg:hidden w-full layout-bleed-full">{editorial}</section>
      <section className="lg:hidden w-full layout-bleed-full py-10 md:py-14 px-4 md:px-8">{shopRail}</section>

      <section className="hidden lg:grid w-full grid-cols-2 gap-0 layout-bleed-full min-h-[min(68vh,620px)] max-h-[720px]">
        {shopOnLeft ? (
          <>
            <div className="w-full min-w-0">{shopRail}</div>
            <div className="w-full relative overflow-hidden min-h-[520px] min-w-0">{editorial}</div>
          </>
        ) : (
          <>
            <div className="w-full relative overflow-hidden min-h-[520px] min-w-0">{editorial}</div>
            <div className="w-full min-w-0">{shopRail}</div>
          </>
        )}
      </section>
    </div>
  );
}
