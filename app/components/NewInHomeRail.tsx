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
      className="group flex flex-shrink-0 w-[148px] sm:w-[172px] md:w-[196px] lg:w-[228px] xl:w-[252px] 2xl:w-[272px] flex-col snap-start"
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
      <p className="mt-3 md:mt-4 text-[10px] sm:text-[11px] md:text-[12px] tracking-[0.16em] uppercase text-neutral-900 text-center truncate px-1">
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
  const railProducts = (products || []).slice(0, 28);
  const hasItems = railProducts.length > 0;
  const countLabel =
    newInCount && newInCount > 0
      ? `${newInCount.toLocaleString()} NEW ITEMS`
      : hasItems
        ? `${railProducts.length} NEW ITEMS`
        : "NEW ARRIVALS";

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === "left" ? -520 : 520, behavior: "smooth" });
  };

  return (
    <section
      className="border-t border-neutral-200/70 py-12 md:py-16 lg:py-20 xl:py-24"
      data-testid="section-new-in"
    >
      <div className="lg:grid lg:grid-cols-[minmax(280px,360px)_1fr] lg:gap-12 xl:gap-16 lg:items-stretch px-4 md:px-8">
        <div className="flex flex-col justify-center gap-4 md:gap-5 mb-10 lg:mb-0 lg:py-6 xl:py-8 min-w-0">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            {countLabel}
          </p>
          <h2 className="text-[38px] sm:text-[44px] md:text-[48px] lg:text-[54px] xl:text-[60px] font-serif leading-[1.02] text-neutral-900">
            New In
          </h2>
          <p className="text-[14px] md:text-[16px] lg:text-[17px] leading-relaxed text-neutral-600 max-w-sm font-light">
            New arrivals across the brands we track — verified natural fibers, refreshed throughout the week.
          </p>
          <Link
            href="/shop?sort=new"
            className="mt-2 inline-flex w-fit items-center justify-center bg-neutral-900 text-white px-8 py-4 text-[10px] md:text-[11px] uppercase tracking-[0.16em] hover:bg-neutral-700 transition-colors"
            data-testid="link-shop-new-in"
          >
            Shop New In
          </Link>
        </div>

        <div className="relative min-w-0 lg:layout-bleed-full lg:pr-0">
          <div
            ref={scrollRef}
            className={`${HORIZONTAL_RAIL_CLASS} gap-3 sm:gap-3.5 md:gap-4 lg:gap-5 min-h-[260px] sm:min-h-[300px] md:min-h-[360px] lg:min-h-[420px] xl:min-h-[460px] pl-0 pr-14 md:pr-16 lg:pl-2 lg:pr-20`}
          >
            {hasItems ? (
              railProducts.map((product: any, i: number) => (
                <NewInProductCard key={product.id} product={product} eager={i < 8} />
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
              className="absolute right-0 lg:right-6 top-[42%] -translate-y-1/2 z-10 w-11 h-11 md:w-12 md:h-12 rounded-full border border-neutral-200 bg-white shadow-sm flex items-center justify-center hover:border-neutral-400 transition-colors"
              aria-label="Scroll New In products"
            >
              <ChevronRight className="w-5 h-5 text-neutral-700" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
