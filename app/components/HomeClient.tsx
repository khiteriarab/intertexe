"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag, Heart } from "lucide-react";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";

function ProductCardSmall({ product }: { product: any }) {
  const name = product.name || "";
  const brandName = product.brandName || "";
  const imageUrl = product.imageUrl || "";
  const price = product.price;
  const composition = product.composition;
  const shopUrl = product.url || null;

  const CardWrapper = shopUrl ? "a" : "div";
  const wrapperProps = shopUrl
    ? { href: shopUrl, target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <CardWrapper
      {...wrapperProps}
      className="group flex-shrink-0 w-[160px] md:w-[220px] flex flex-col cursor-pointer"
      data-testid={`product-home-${product.id}`}
    >
      <div className="aspect-[3/4] bg-[#f5f5f5] relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-neutral-300" />
          </div>
        )}
        {composition && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] md:text-[9px] uppercase tracking-[0.05em] font-medium backdrop-blur-sm line-clamp-1 max-w-[140px] md:max-w-[200px]">
              {composition}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 pt-2.5">
        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em]">
          {brandName}
        </span>
        <h3 className="text-[11px] md:text-[12px] leading-snug line-clamp-2 text-muted-foreground">
          {name}
        </h3>
        {price && (
          <span className="text-[11px] md:text-[12px] mt-0.5">{price}</span>
        )}
      </div>
    </CardWrapper>
  );
}

export function HorizontalProductScroll({
  products,
  title,
  subtitle,
  linkHref,
  linkText,
}: {
  products: any[];
  title: string;
  subtitle?: string;
  linkHref: string;
  linkText: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -400 : 400;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex items-center justify-between">
        <Link
          href={linkHref}
          className="flex items-center gap-3 group"
          data-testid={`link-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div className="flex flex-col">
            {subtitle && (
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {subtitle}
              </span>
            )}
            <h2 className="text-lg md:text-2xl font-serif group-hover:text-muted-foreground transition-colors">
              {title}
            </h2>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-9 h-9 border border-border/50 flex items-center justify-center hover:border-foreground/40 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-9 h-9 border border-border/50 flex items-center justify-center hover:border-foreground/40 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-8 md:px-8 pb-2"
      >
        {products.map((product: any) => (
          <ProductCardSmall key={product.id} product={product} />
        ))}
      </div>

      <Link
        href={linkHref}
        className="self-start text-[10px] md:text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        data-testid={`link-shop-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {linkText} <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

export function BrandGrid({
  designers,
  productCounts,
}: {
  designers: any[];
  productCounts: Record<string, number>;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-5">
      {designers.map((designer: any) => {
        const tier = getQualityTier(designer.naturalFiberPercent);
        const count = productCounts[designer.slug] || 0;
        return (
          <Link
            key={designer.id}
            href={`/designers/${designer.slug}`}
            className="group flex flex-col gap-2.5 active:scale-[0.98] transition-transform"
            data-testid={`card-designer-${designer.id}`}
          >
            <div className="aspect-[3/4] bg-[#f5f5f5] w-full overflow-hidden relative">
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
              {count > 0 && (
                <div className="absolute bottom-2.5 right-2.5">
                  <span className="flex items-center gap-1 bg-white/90 text-black px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
                    <ShoppingBag className="w-2.5 h-2.5" />
                    {count} products
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.06em] group-hover:text-muted-foreground transition-colors">
                {designer.name}
              </h3>
              <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">
                {tier.label}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
