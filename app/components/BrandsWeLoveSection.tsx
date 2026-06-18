"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getBrandHeroImage } from "../../lib/brand-hero-images";
import { BRANDS_WE_LOVE_HIGHLIGHTS } from "../../lib/brands-we-love-editorial";
import { getQualityTier } from "../../lib/quality-tiers";
import { displayNaturalFiberPercent } from "../../lib/display-natural-fiber";
import { CURATED_BRAND_SLUGS } from "../../lib/homepage-constants";
import { HORIZONTAL_RAIL_INSET_CLASS } from "../../lib/horizontal-rail";

type BrandDesigner = {
  slug: string;
  name: string;
  heroImageUrl?: string | null;
  naturalFiberPercent?: number | null;
};

function BrandLoveCard({ designer }: { designer: BrandDesigner }) {
  const [failed, setFailed] = useState(false);
  const imageUrl =
    !failed && (designer.heroImageUrl || getBrandHeroImage(designer.name) || "");
  const highlight = BRANDS_WE_LOVE_HIGHLIGHTS[designer.slug] || "";
  const score = displayNaturalFiberPercent(designer.naturalFiberPercent);
  const tier = getQualityTier(designer.naturalFiberPercent);

  return (
    <Link
      href={`/designers/${designer.slug}`}
      className="group flex flex-shrink-0 w-[78vw] sm:w-[52vw] md:w-auto snap-start flex-col gap-4 md:gap-5"
      data-rail-card
      data-testid={`card-designer-${designer.slug}`}
      draggable={false}
    >
      <div className="aspect-[4/5] bg-[#f3f2f0] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={designer.name}
            className="w-full h-full object-cover object-[center_28%] transition-transform duration-700 group-hover:scale-[1.02]"
            loading="lazy"
            draggable={false}
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center px-6">
            <span className="font-serif text-xl text-neutral-300 uppercase tracking-[0.12em] text-center">
              {designer.name}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 md:gap-2.5 pr-1 md:pr-2">
        <h3 className="font-serif text-[22px] md:text-[26px] lg:text-[28px] leading-[1.12] text-neutral-900">
          {designer.name}
        </h3>
        {score != null && (
          <p className="text-[11px] md:text-[12px] uppercase tracking-[0.14em] text-neutral-500">
            <span className="text-neutral-800 font-medium tabular-nums">{score}%</span> natural fibers
            <span className="text-neutral-300 mx-2">·</span>
            <span className="text-neutral-600">{tier.label}</span>
          </p>
        )}
        {highlight ? (
          <p className="text-[13px] md:text-[14px] text-neutral-600 leading-relaxed font-light max-w-sm">
            {highlight}
          </p>
        ) : null}
        <span className="mt-1 text-[12px] md:text-[13px] text-neutral-900 underline underline-offset-[5px] decoration-neutral-300 group-hover:decoration-neutral-900 transition-colors w-fit">
          Shop the collection
        </span>
      </div>
    </Link>
  );
}

export function BrandsWeLoveSection({ designers }: { designers: BrandDesigner[] }) {
  const ordered = CURATED_BRAND_SLUGS.map((slug) => designers.find((d) => d.slug === slug)).filter(
    Boolean
  ) as BrandDesigner[];

  if (ordered.length === 0) {
    return (
      <section className="py-10 md:py-16 border-t border-neutral-200/60" data-testid="homepage-brands-we-love">
        <div className="rounded-sm border border-neutral-200/80 bg-neutral-50/50 px-4 py-8 text-center">
          <p className="text-[12px] text-neutral-500 max-w-md mx-auto leading-relaxed">
            Designer highlights are refreshing. Explore the{" "}
            <Link href="/designers" className="underline text-neutral-800">
              brand directory
            </Link>{" "}
            for every label we track.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-16 lg:py-20 border-t border-neutral-200/60" data-testid="homepage-brands-we-love">
      <div className="flex justify-between items-end mb-8 md:mb-10 lg:mb-12">
        <p className="text-[9px] md:text-[10px] uppercase tracking-[0.35em] text-neutral-400">
          Brands we love
        </p>
        <Link
          href="/designers"
          className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-neutral-800 transition-colors duration-300 flex items-center gap-2"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div
        className={`${HORIZONTAL_RAIL_INSET_CLASS} flex md:grid md:grid-cols-3 md:overflow-visible md:snap-none gap-6 md:gap-8 lg:gap-10 xl:gap-12 md:mx-0 md:px-0`}
      >
        {ordered.map((designer) => (
          <BrandLoveCard key={designer.slug} designer={designer} />
        ))}
      </div>
    </section>
  );
}
