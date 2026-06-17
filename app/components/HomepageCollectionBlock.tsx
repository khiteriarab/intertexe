"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditorialHeroImage } from "./EditorialHeroImage";
import { editorialHeroForSlug } from "../../lib/editorial-assets";
import { canonicalProductId } from "../../lib/canonical-product-id";
import { cfProductCard } from "../../lib/cloudflare-images";
import type { CollectionSectionConfig } from "../../lib/site-architecture";
import { HORIZONTAL_RAIL_CLASS } from "../../lib/horizontal-rail";

function railImageSrc(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return cfProductCard(trimmed) || trimmed;
}

function CollectionProductCard({ product, eager }: { product: any; eager?: boolean }) {
  const name = product.name || "";
  const brandName = product.brandName || product.brand_name || "";
  const rawUrl = (product.imageUrl || product.image_url || "").trim();
  const productHref = `/product/${canonicalProductId(product)}`;
  const [src, setSrc] = useState(() => railImageSrc(rawUrl));

  useEffect(() => {
    setSrc(railImageSrc(rawUrl));
  }, [rawUrl]);

  return (
    <Link
      href={productHref}
      className="group flex flex-shrink-0 w-[132px] sm:w-[148px] md:w-[164px] lg:w-[176px] xl:w-[188px] flex-col snap-start"
      data-rail-card
      draggable={false}
    >
      <div className="aspect-[3/4] bg-[#f3f2f0] relative overflow-hidden">
        {rawUrl ? (
          <img
            src={src || rawUrl}
            alt={name || brandName}
            className="absolute inset-0 w-full h-full object-cover object-[center_28%] group-hover:scale-[1.03] transition-transform duration-700"
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            onError={() => {
              if (src !== rawUrl) setSrc(rawUrl);
            }}
          />
        ) : null}
      </div>
      <p className="mt-2.5 text-[10px] sm:text-[11px] tracking-[0.14em] uppercase text-neutral-600 truncate">
        {brandName}
      </p>
    </Link>
  );
}

/**
 * Homepage collection edit — mobile: image then rail below.
 * Desktop: image left, product rail right (avoids ultra-wide crop on landscape heroes).
 */
/** When true, desktop layout is products left / editorial image right (Evening, Summer in the City). */
const SHOP_ON_LEFT_SLUGS = new Set(["evening", "summer-in-the-city"]);

const COLLECTION_RAIL_LIMIT = 20;

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
  const imageUrl = editorialHeroForSlug(collection.slug);
  const hasItems = products.length > 0;
  const railProducts = products.slice(0, COLLECTION_RAIL_LIMIT);

  const editorial = (
    <Link
      href={collection.href}
      className="group relative block w-full h-full min-h-[420px] lg:min-h-0 overflow-hidden touch-manipulation"
      data-testid={`link-collection-${collection.slug}`}
    >
      {imageUrl && (
        <EditorialHeroImage
          src={imageUrl}
          alt={collection.label}
          variant="collection"
          slug={collection.slug}
          title={collection.label}
          className="h-full min-h-[420px] lg:min-h-full lg:absolute lg:inset-0"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-7 md:p-10 lg:p-12 gap-2">
        <span className="text-white/45 text-[9px] md:text-[10px] uppercase tracking-[0.35em] font-light">
          {collection.kicker}
        </span>
        <h3 className="text-white text-[30px] md:text-[38px] lg:text-[44px] font-serif leading-[1.08] max-w-md">
          {collection.label}
        </h3>
        <p className="text-white/55 text-[11px] md:text-[13px] font-light max-w-sm leading-relaxed mt-1 normal-case tracking-normal">
          {collection.subtitle}
        </p>
        <span className="text-white/70 text-[10px] uppercase tracking-[0.2em] mt-3 md:mt-4 flex items-center gap-2 group-hover:gap-3 group-hover:text-white transition-all duration-300">
          Discover <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );

  const shopRail = (
    <div className="flex flex-col justify-center h-full w-full py-5 lg:py-6 px-3 md:px-5 lg:px-6 xl:px-7 bg-[#FAFAF8]">
      <h2 className="sr-only">{title}</h2>
      <p className="sr-only">{subtitle}</p>

      <div
        className={`${HORIZONTAL_RAIL_CLASS} gap-2.5 md:gap-3 lg:gap-3.5 min-h-[220px] sm:min-h-[250px] lg:min-h-[280px] xl:min-h-[300px] -mx-1`}
      >
        {hasItems ? (
          railProducts.map((product: any, i: number) => (
            <CollectionProductCard key={product.id} product={product} eager={i < 4} />
          ))
        ) : (
          <p className="text-[11px] text-neutral-400 max-w-xs leading-relaxed">
            This edit is refreshing — view the full collection for the latest pieces.
          </p>
        )}
      </div>

      <Link
        href={collection.href}
        className="mt-4 text-[10px] uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-800 transition-colors flex items-center gap-2 w-fit"
      >
        View full collection <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );

  return (
    <div
      className="w-full max-w-none border-t border-neutral-200/60"
      data-testid={`homepage-collection-${collection.slug}`}
    >
      <section className="lg:hidden w-full layout-bleed-full">{editorial}</section>
      <section className="lg:hidden w-full layout-bleed-full py-5 md:py-6 px-3 md:px-5">{shopRail}</section>

      <section className="hidden lg:grid w-full grid-cols-2 gap-0 layout-bleed-full min-h-[min(72vh,680px)] max-h-[760px]">
        {shopOnLeft ? (
          <>
            <div className="w-full min-w-0">{shopRail}</div>
            <div className="w-full relative overflow-hidden min-h-[560px] min-w-0">{editorial}</div>
          </>
        ) : (
          <>
            <div className="w-full relative overflow-hidden min-h-[560px] min-w-0">{editorial}</div>
            <div className="w-full min-w-0">{shopRail}</div>
          </>
        )}
      </section>
    </div>
  );
}
