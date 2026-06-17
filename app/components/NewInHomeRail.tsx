"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cfProductCard } from "../../lib/cloudflare-images";
import { canonicalProductId } from "../../lib/canonical-product-id";
import { HORIZONTAL_RAIL_BLEED_CLASS } from "../../lib/horizontal-rail";

function railImageSrc(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return cfProductCard(trimmed) || trimmed;
}

function NewInProductCard({ product, eager }: { product: any; eager?: boolean }) {
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
      className="group flex flex-shrink-0 w-[100px] sm:w-[118px] md:w-[148px] flex-col snap-start"
      data-rail-card
      data-testid={`product-new-in-${product.id}`}
      draggable={false}
    >
      <div className="aspect-[4/5] bg-[#f3f2f0] relative overflow-hidden">
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
      <p className="mt-2.5 text-[10px] sm:text-[11px] tracking-[0.14em] uppercase text-neutral-900 text-center truncate px-0.5">
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
  const railProducts = (products || []).slice(0, 12);
  const hasItems = railProducts.length > 0;
  const countLabel =
    newInCount && newInCount > 0
      ? `${newInCount.toLocaleString()} NEW ITEMS`
      : hasItems
        ? `${railProducts.length} NEW ITEMS`
        : "NEW ARRIVALS";

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === "left" ? -280 : 280, behavior: "smooth" });
  };

  return (
    <section
      className="border-t border-neutral-200/70 py-8 md:py-10"
      data-testid="section-new-in"
    >
      <div className="flex flex-row items-stretch gap-4 sm:gap-6 md:gap-8 lg:gap-10 px-4 md:px-8">
        <div className="w-[38%] sm:w-[34%] md:w-[min(32%,280px)] lg:w-[min(34%,300px)] flex-shrink-0 flex flex-col justify-center gap-2.5 sm:gap-3 md:gap-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-neutral-500 leading-snug">
            {countLabel}
          </p>
          <h2 className="text-[26px] sm:text-[32px] md:text-[40px] font-serif leading-[1.05] text-neutral-900">
            New In
          </h2>
          <p className="hidden sm:block text-[12px] md:text-[14px] leading-relaxed text-neutral-600 max-w-sm font-light">
            New arrivals across the brands we track — verified natural fibers, refreshed throughout the week.
          </p>
          <Link
            href="/shop?sort=new"
            className="mt-0.5 sm:mt-1 inline-flex w-full sm:w-fit items-center justify-center bg-neutral-900 text-white px-3 sm:px-5 py-2.5 sm:py-3 text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.16em] hover:bg-neutral-700 transition-colors text-center"
            data-testid="link-shop-new-in"
          >
            Shop New In
          </Link>
        </div>

        <div className="relative flex-1 min-w-0">
          <div
            ref={scrollRef}
            className={`${HORIZONTAL_RAIL_BLEED_CLASS} gap-2 md:gap-2.5 min-h-[150px] sm:min-h-[170px] md:min-h-[190px] pr-10 sm:pr-12 md:pr-14 !px-0`}
          >
            {hasItems ? (
              railProducts.map((product: any, i: number) => (
                <NewInProductCard key={product.id} product={product} eager={i < 4} />
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
              className="absolute right-2 md:right-0 top-[38%] -translate-y-1/2 z-10 w-9 h-9 md:w-10 md:h-10 rounded-full border border-neutral-200 bg-white shadow-sm flex items-center justify-center hover:border-neutral-400 transition-colors"
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
