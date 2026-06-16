"use client";

import { useState } from "react";
import Link from "next/link";
import { getBrandHeroImage } from "../../lib/brand-hero-images";

function MagazineBrandTile({
  designer,
  className,
}: {
  designer: { id?: string; slug: string; name: string; heroImageUrl?: string };
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = !failed
    ? designer.heroImageUrl || getBrandHeroImage(designer.name) || ""
    : "";

  return (
    <Link
      href={`/designers/${designer.slug}`}
      className={`group relative block overflow-hidden touch-manipulation bg-[#eae8e4] ${className ?? ""}`}
      data-testid={`card-designer-${designer.id ?? designer.slug}`}
    >
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={`${designer.name} editorial`}
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
          loading="eager"
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <span className="font-serif text-xl text-neutral-400 tracking-[0.12em] uppercase text-center">
            {designer.name}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-5 md:p-7">
        <h3 className="text-title text-white font-semibold uppercase tracking-[0.08em] group-hover:text-white/80 transition-colors">
          {designer.name}
        </h3>
      </div>
    </Link>
  );
}

/** Magazine grid — one large hero tile (60vw) + two stacked tiles (40vw). */
export function BrandMagazineGrid({ designers }: { designers: any[] }) {
  const [hero, ...rest] = designers.slice(0, 3);

  if (!hero) {
    return (
      <div className="rounded-sm border border-neutral-200/80 bg-neutral-50/50 px-4 py-8 text-center">
        <p className="text-body text-neutral-500 max-w-md mx-auto">
          Designer highlights are refreshing. Explore the{" "}
          <Link href="/designers" className="underline text-neutral-800">
            brand directory
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div
      className="layout-bleed-full flex flex-col md:flex-row w-full min-h-[min(85svh,720px)]"
      data-testid="brands-magazine-grid"
    >
      <MagazineBrandTile designer={hero} className="w-full md:w-[60vw] min-h-[50vh] md:min-h-full" />
      <div className="w-full md:w-[40vw] flex flex-col min-h-[50vh] md:min-h-full">
        {rest[0] && (
          <MagazineBrandTile designer={rest[0]} className="flex-1 min-h-[25vh] md:min-h-0" />
        )}
        {rest[1] && (
          <MagazineBrandTile designer={rest[1]} className="flex-1 min-h-[25vh] md:min-h-0" />
        )}
      </div>
    </div>
  );
}
