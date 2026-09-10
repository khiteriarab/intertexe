"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cfProductCard } from "../../lib/cloudflare-images";
import { formatDisplayPrice, formatDisplayOriginalPrice } from "../../lib/format-display-price";
import {
  HORIZONTAL_RAIL_BLEED_PROXIMITY_CLASS,
  HORIZONTAL_RAIL_BLEED_WRAPPER_CLASS,
  HOMEPAGE_PRODUCT_CARD_WIDTH_CLASS,
} from "../../lib/horizontal-rail";

function railImageSrc(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return cfProductCard(trimmed) || trimmed;
}

function SaleProductCard({
  product,
  eager,
  suppressNavigate,
}: {
  product: any;
  eager?: boolean;
  suppressNavigate?: () => boolean;
}) {
  const name = product.name || "";
  const brandName = product.brandName || product.brand_name || "";
  const rawUrl = (product.imageUrl || product.image_url || "").trim();
  const productHref = `/product/${product.id}`;
  const priceShown = formatDisplayPrice(product);
  const originalShown = formatDisplayOriginalPrice(product);
  const originalNum = product.originalPrice
    ? parseFloat(String(product.originalPrice).replace(/[^0-9.]/g, ""))
    : 0;
  const currentNum = product.price ? parseFloat(String(product.price).replace(/[^0-9.]/g, "")) : 0;
  const discountPct = originalNum > 0 ? Math.round((1 - currentNum / originalNum) * 100) : 0;
  const [src, setSrc] = useState(() => railImageSrc(rawUrl));

  useEffect(() => {
    setSrc(railImageSrc(rawUrl));
  }, [rawUrl]);

  return (
    <Link
      href={productHref}
      className={`group flex flex-col ${HOMEPAGE_PRODUCT_CARD_WIDTH_CLASS}`}
      data-rail-card
      data-testid={`product-sale-${product.id}`}
      draggable={false}
      onClick={(e) => {
        if (suppressNavigate?.()) {
          e.preventDefault();
        }
      }}
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
        {discountPct > 0 && (
          <span className="absolute top-2 left-2 z-10 bg-black text-white px-1.5 py-0.5 text-[7px] uppercase tracking-[0.1em]">
            {discountPct}% off
          </span>
        )}
      </div>
      <div className="mt-2.5 flex flex-col gap-0.5 min-w-0">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-900 truncate">
          {brandName}
        </p>
        <p className="text-[10px] sm:text-[11px] text-neutral-500 truncate leading-snug">{name}</p>
        {priceShown && (
          <p className="text-[10px] sm:text-[11px] font-medium text-neutral-900 mt-0.5">{priceShown}</p>
        )}
        {originalShown && (
          <p className="text-[9px] text-neutral-400 line-through">{originalShown}</p>
        )}
      </div>
    </Link>
  );
}

function useRailDragScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || e.pointerType === "mouse") return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startScroll: el.scrollLeft,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!el || !drag.active) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 6) drag.moved = true;
    if (drag.moved) {
      el.scrollLeft = drag.startScroll - dx;
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    dragRef.current.active = false;
  }, []);

  const scrollBy = useCallback((direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -560 : 560,
      behavior: "smooth",
    });
  }, []);

  return {
    scrollRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    suppressNavigate: () => dragRef.current.moved,
    scrollBy,
  };
}

export function SaleHomeRail({ products: initialProducts }: { products?: any[] }) {
  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const { scrollRef, onPointerDown, onPointerMove, onPointerUp, suppressNavigate, scrollBy } =
    useRailDragScroll();

  useEffect(() => {
    setProducts(initialProducts || []);
  }, [initialProducts]);

  useEffect(() => {
    if ((initialProducts || []).length > 0) return;
    let cancelled = false;
    fetch("/api/homepage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.saleProducts?.length) return;
        setProducts(data.saleProducts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialProducts]);

  const railProducts = products.slice(0, 28);
  const hasItems = railProducts.length > 0;

  return (
    <section
      className="border-t border-neutral-200/70 py-10 md:py-14 lg:py-16 lg:layout-bleed-full"
      data-testid="section-sale"
    >
      <div className="px-4 md:px-8 mb-6 md:mb-8">
        <Link href="/sale" className="group inline-flex items-center gap-2" data-testid="link-sale">
          <h2 className="text-[34px] sm:text-[40px] md:text-[44px] lg:text-[48px] font-serif leading-[1.02] group-hover:text-neutral-500 transition-colors">
            Sale
          </h2>
          <ArrowRight className="w-4 h-4 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>

      {hasItems ? (
        <>
          <div className={`relative min-w-0 ${HORIZONTAL_RAIL_BLEED_WRAPPER_CLASS}`}>
        <div
          ref={scrollRef}
          className={`${HORIZONTAL_RAIL_BLEED_PROXIMITY_CLASS} gap-4 sm:gap-4 md:gap-5 lg:gap-6 pr-14 md:pr-16`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {railProducts.map((product: any, i: number) => (
            <SaleProductCard
              key={product.id}
              product={product}
              eager={i < 8}
              suppressNavigate={suppressNavigate}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollBy("left")}
          className="absolute left-1 md:left-4 top-[38%] -translate-y-1/2 z-10 w-10 h-10 md:w-11 md:h-11 rounded-full border border-neutral-200 bg-white/95 shadow-sm flex items-center justify-center hover:border-neutral-400 transition-colors"
          aria-label="Scroll sale products left"
        >
          <ChevronLeft className="w-5 h-5 text-neutral-700" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy("right")}
          className="absolute right-1 md:right-4 top-[38%] -translate-y-1/2 z-10 w-10 h-10 md:w-11 md:h-11 rounded-full border border-neutral-200 bg-white/95 shadow-sm flex items-center justify-center hover:border-neutral-400 transition-colors"
          aria-label="Scroll sale products right"
        >
          <ChevronRight className="w-5 h-5 text-neutral-700" />
        </button>
      </div>

      <div className="px-4 md:px-8 mt-5 md:mt-6 pb-[max(0px,env(safe-area-inset-bottom))]">
        <Link
          href="/sale"
          className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-800 transition-colors inline-flex items-center gap-2"
          data-testid="link-shop-all-sale"
        >
          Shop all sale <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
        </>
      ) : (
        <div className="px-4 md:px-8">
          <p className="text-[12px] md:text-[13px] text-neutral-400 max-w-md leading-relaxed">
            Sale picks are refreshing — browse the full sale edit for verified natural-fiber markdowns.
          </p>
          <Link
            href="/sale"
            className="mt-4 text-[10px] uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-800 transition-colors inline-flex items-center gap-2"
            data-testid="link-shop-all-sale-empty"
          >
            Shop all sale <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </section>
  );
}
