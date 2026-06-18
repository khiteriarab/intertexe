"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cfProductCard } from "../../lib/cloudflare-images";
import { formatDisplayPrice, formatDisplayOriginalPrice } from "../../lib/format-display-price";
import {
  HORIZONTAL_RAIL_BLEED_CLASS,
  HORIZONTAL_RAIL_BLEED_WRAPPER_CLASS,
} from "../../lib/horizontal-rail";

function railImageSrc(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return cfProductCard(trimmed) || trimmed;
}

function SaleProductCard({ product, eager }: { product: any; eager?: boolean }) {
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
      className="group flex flex-shrink-0 w-[148px] sm:w-[172px] md:w-[196px] lg:w-[228px] xl:w-[252px] 2xl:w-[272px] flex-col snap-start"
      data-rail-card
      data-testid={`product-sale-${product.id}`}
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

export function SaleHomeRail({ products }: { products?: any[] }) {
  const railProducts = (products || []).slice(0, 28);
  const hasItems = railProducts.length > 0;

  return (
    <section className="border-t border-neutral-200/70 py-10 md:py-14 lg:py-16 layout-bleed-full" data-testid="section-sale">
      <div className="px-4 md:px-8 mb-6 md:mb-8">
        <Link href="/sale" className="group inline-flex items-center gap-2" data-testid="link-sale">
          <h2 className="text-[34px] sm:text-[40px] md:text-[44px] lg:text-[48px] font-serif leading-[1.02] group-hover:text-neutral-500 transition-colors">
            Sale
          </h2>
          <ArrowRight className="w-4 h-4 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>

      <div className={`relative min-w-0 ${HORIZONTAL_RAIL_BLEED_WRAPPER_CLASS}`}>
        <div
          className={`${HORIZONTAL_RAIL_BLEED_CLASS} gap-2.5 sm:gap-3 md:gap-3.5 lg:gap-4 min-h-[220px] sm:min-h-[260px] md:min-h-[300px] lg:min-h-[340px]`}
        >
          {hasItems ? (
            railProducts.map((product: any, i: number) => (
              <SaleProductCard key={product.id} product={product} eager={i < 8} />
            ))
          ) : (
            <p className="text-[12px] text-neutral-400 max-w-sm leading-relaxed py-6">
              Sale pieces are refreshing — browse the full sale edit for reduced natural-fiber pieces.
            </p>
          )}
        </div>
      </div>

      <div className="px-4 md:px-8 mt-5 md:mt-6">
        <Link
          href="/sale"
          className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-800 transition-colors inline-flex items-center gap-2"
          data-testid="link-shop-all-sale"
        >
          Shop all sale <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </section>
  );
}
