"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cfProductCard } from "../../lib/cloudflare-images";
import { HORIZONTAL_RAIL_CLASS } from "../../lib/horizontal-rail";

function railImageSrc(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return cfProductCard(trimmed) || trimmed;
}

function NewInProductCard({ product, eager }: { product: any; eager?: boolean }) {
  const name = product.name || "";
  const brandName = product.brandName || product.brand_name || "";
  const rawUrl = (product.imageUrl || product.image_url || "").trim();
  const productHref = `/product/${product.id}`;
  const [src, setSrc] = useState(() => railImageSrc(rawUrl));

  useEffect(() => {
    setSrc(railImageSrc(rawUrl));
  }, [rawUrl]);

  return (
    <Link
      href={productHref}
      className="group flex flex-shrink-0 w-[132px] sm:w-[156px] md:w-[172px] lg:w-[196px] xl:w-[212px] flex-col snap-start"
      data-rail-card
      data-testid={`product-new-in-${product.id}`}
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
        ) : (
          <div className="absolute inset-0 bg-[#eceae6]" />
        )}
      </div>
      <p className="mt-3 text-[10px] sm:text-[11px] tracking-[0.16em] uppercase text-neutral-900 text-center truncate px-1">
        {brandName}
      </p>
    </Link>
  );
}

export function NewInHomeRail({
  products,
  newInCount,
}: {
  products: any[];
  newInCount?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const railProducts = (products || []).slice(0, 24);
  const hasItems = railProducts.length > 0;
  const countLabel =
    newInCount && newInCount > 0
      ? `${newInCount.toLocaleString()} NEW ITEMS`
      : hasItems
        ? `${railProducts.length} NEW ITEMS`
        : "NEW ARRIVALS";

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === "left" ? -420 : 420, behavior: "smooth" });
  };

  return (
    <section
      className="border-t border-neutral-200/70 py-10 md:py-14 lg:py-16"
      data-testid="section-new-in"
    >
      <div className="lg:grid lg:grid-cols-[minmax(240px,300px)_1fr] lg:gap-10 xl:gap-14 lg:items-stretch px-4 md:px-8">
        <div className="flex flex-col justify-center gap-3 md:gap-4 mb-8 lg:mb-0 lg:py-4 min-w-0">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            {countLabel}
          </p>
          <h2 className="text-[34px] sm:text-[40px] md:text-[44px] lg:text-[48px] font-serif leading-[1.02] text-neutral-900">
            New In
          </h2>
          <p className="text-[13px] md:text-[15px] leading-relaxed text-neutral-600 max-w-sm font-light">
            New arrivals across the brands we track — verified natural fibers, refreshed throughout the week.
          </p>
          <Link
            href="/shop?sort=new"
            className="mt-1 inline-flex w-fit items-center justify-center bg-neutral-900 text-white px-6 py-3.5 text-[10px] md:text-[11px] uppercase tracking-[0.16em] hover:bg-neutral-700 transition-colors"
            data-testid="link-shop-new-in"
          >
            Shop New In
          </Link>
        </div>

        <div className="relative min-w-0 lg:layout-bleed-full lg:pr-0">
          <div
            ref={scrollRef}
            className={`${HORIZONTAL_RAIL_CLASS} gap-2.5 sm:gap-3 md:gap-3.5 lg:gap-4 min-h-[220px] sm:min-h-[260px] md:min-h-[300px] lg:min-h-[340px] pl-0 pr-12 md:pr-14 lg:pl-2 lg:pr-16`}
          >
            {hasItems ? (
              railProducts.map((product: any, i: number) => (
                <NewInProductCard key={product.id} product={product} eager={i < 6} />
              ))
            ) : (
              <p className="text-[12px] text-neutral-400 max-w-sm leading-relaxed py-6">
                New arrivals are refreshing — browse the shop for the latest pieces.
              </p>
            )}
          </div>

          {hasItems && (
            <button
              type="button"
              onClick={() => scroll("right")}
              className="absolute right-0 lg:right-4 top-[42%] -translate-y-1/2 z-10 w-10 h-10 md:w-11 md:h-11 rounded-full border border-neutral-200 bg-white shadow-sm flex items-center justify-center hover:border-neutral-400 transition-colors"
              aria-label="Scroll New In products"
            >
              <ChevronRight className="w-4 h-4 text-neutral-700" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
