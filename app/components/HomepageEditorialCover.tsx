"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditorialHeroImage } from "./EditorialHeroImage";

type HomepageEditorialCoverProps = {
  href: string;
  imageUrl: string;
  kicker: string;
  title: string;
  body?: string;
  cta: string;
  testId: string;
  slug?: string;
  /** CSS min-height, e.g. 85svh or 100svh */
  minHeightClass?: string;
};

/** Full-bleed editorial cover — no product rail. */
export function HomepageEditorialCover({
  href,
  imageUrl,
  kicker,
  title,
  body,
  cta,
  testId,
  slug,
  minHeightClass = "min-h-[85svh]",
}: HomepageEditorialCoverProps) {
  return (
    <Link
      href={href}
      className={`group relative block w-full layout-bleed-full overflow-hidden touch-manipulation ${minHeightClass}`}
      data-testid={testId}
    >
      {imageUrl && (
        <EditorialHeroImage
          src={imageUrl}
          alt={title}
          variant="collection"
          slug={slug}
          title={title}
          className="absolute inset-0 h-full min-h-full"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-10 flex flex-col justify-end px-6 pb-16 md:px-14 md:pb-20 gap-2 max-w-xl">
        <span className="text-label text-white/50 uppercase">{kicker}</span>
        <h2 className="text-display text-white">{title}</h2>
        {body && (
          <p className="text-body text-white/60 font-light max-w-sm mt-1">{body}</p>
        )}
        <span className="text-label text-white/75 uppercase mt-4 md:mt-6 flex items-center gap-2 group-hover:gap-3 group-hover:text-white transition-all duration-300">
          {cta} <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}
