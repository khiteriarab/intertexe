"use client";

import Link from "next/link";
import { useCallback } from "react";
import type { FeaturedDesignerCard } from "../../lib/featured-designers";
import { CATALOG_STATS } from "../../lib/catalog-stats";

function BrandFeaturedCard({ brand }: { brand: FeaturedDesignerCard }) {
  const src = brand.heroImageUrl || "";

  return (
    <Link
      href={`/designers/${brand.slug}`}
      className="relative overflow-hidden group cursor-pointer block"
      data-testid={`card-featured-designer-${brand.slug}`}
    >
      <div className="aspect-[3/4] relative">
        {src ? (
          <img
            src={src}
            alt={brand.name}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-[#f0ece6] flex items-center justify-center px-4">
            <span className="font-serif text-lg text-neutral-300 tracking-[0.15em] uppercase text-center">
              {brand.name}
            </span>
          </div>
        )}
      </div>

      <div
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
        aria-hidden
      />

      <div className="absolute bottom-0 left-0 p-4 z-[1]">
        <p className="text-white text-xs tracking-widest uppercase font-light">{brand.name}</p>
        <p
          className="text-white/60 text-xs tracking-widest uppercase mt-0.5"
          style={{ fontSize: "9px", letterSpacing: "0.2em" }}
        >
          EXCEPTIONAL
        </p>
      </div>
    </Link>
  );
}

export function FeaturedDesignersGrid({
  brands,
  vettedBrandCount,
}: {
  brands: FeaturedDesignerCard[];
  vettedBrandCount: number;
}) {
  const scrollToDirectory = useCallback(() => {
    document.getElementById("directory-az-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (brands.length === 0) {
    return (
      <section className="flex flex-col" data-testid="section-featured-designers-loading">
        <h2
          className="text-xs tracking-widest text-gray-400 uppercase mb-5"
          style={{ letterSpacing: "0.2em" }}
        >
          FEATURED DESIGNERS
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-[#f0ece6] animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  const vettedLabel = vettedBrandCount > 0 ? vettedBrandCount.toLocaleString() : CATALOG_STATS.brandCount.toLocaleString();

  return (
    <section className="flex flex-col" data-testid="section-featured-designers">
      <h2
        className="text-xs tracking-widest text-gray-400 uppercase mb-5"
        style={{ letterSpacing: "0.2em" }}
      >
        FEATURED DESIGNERS
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {brands.map((brand) => (
          <BrandFeaturedCard key={brand.slug} brand={brand} />
        ))}
      </div>

      <div className="flex items-center justify-between mt-8 mb-12">
        <p
          className="text-xs tracking-widest text-gray-400 uppercase"
          style={{ letterSpacing: "0.2em" }}
          data-testid="text-vetted-brand-count"
        >
          {vettedLabel} brands vetted
        </p>
        <button
          type="button"
          onClick={scrollToDirectory}
          className="text-xs tracking-widest uppercase text-gray-900 underline underline-offset-4"
          style={{ letterSpacing: "0.2em" }}
          data-testid="link-view-all-designers"
        >
          View all designers →
        </button>
      </div>
    </section>
  );
}
