"use client";

import Link from "next/link";
import { COLLECTION_SECTIONS } from "../../lib/site-architecture";
import { editorialHeroForSlug } from "../../lib/editorial-assets";

const HERO_SLUG = "summer-in-the-city";

const GRID_SLUGS = ["vacation", "evening", "tailoring", "white-edit"] as const;

const GRID_SUBLINES: Record<string, string> = {
  vacation: "Linen & silk.",
  evening: "After dark.",
  tailoring: "Outlast every trend.",
  "white-edit": "Ivory. Chalk. Cream.",
};

function collectionForSlug(slug: string) {
  return COLLECTION_SECTIONS.find((c) => c.slug === slug);
}

function CollectionCoverLink({
  slug,
  className = "",
  compact = false,
}: {
  slug: string;
  className?: string;
  compact?: boolean;
}) {
  const collection = collectionForSlug(slug);
  if (!collection) return null;

  const imageUrl = editorialHeroForSlug(slug);
  const subtitle = compact
    ? GRID_SUBLINES[slug] ?? collection.subtitle
    : collection.subtitle;

  return (
    <Link
      href={collection.href}
      className={`group relative block overflow-hidden bg-[#1c1c1c] ${className}`}
      data-testid={`link-collection-${slug}`}
    >
      <img
        src={imageUrl}
        alt={collection.label}
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading={slug === HERO_SLUG ? "eager" : "lazy"}
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
      <div
        className={`absolute inset-x-0 bottom-0 z-10 pointer-events-none ${
          compact ? "px-3 pb-3 lg:px-4 lg:pb-4" : "px-5 pb-5 md:px-8 md:pb-8 lg:px-10 lg:pb-10"
        }`}
      >
        <p
          className={`uppercase tracking-[0.2em] text-white/70 mb-1 ${
            compact ? "text-[8px] lg:text-[9px]" : "text-[10px]"
          }`}
        >
          {collection.kicker}
        </p>
        <p
          className={`font-serif text-white leading-tight ${
            compact
              ? "text-[15px] lg:text-[17px] line-clamp-2"
              : "text-[24px] md:text-[30px] lg:text-[36px]"
          }`}
        >
          {collection.label}
        </p>
        <p
          className={`font-light text-white/80 leading-snug mt-1 ${
            compact ? "text-[9px] lg:text-[10px] line-clamp-2" : "text-[11px] md:text-[13px] line-clamp-2"
          }`}
        >
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

export function CollectionsEditClient() {
  return (
    <div className="flex flex-col w-full" data-testid="page-collections-edit">
      <div className="layout-bleed-full px-4 md:px-8 pt-4 md:pt-6 pb-2 md:pb-3">
        <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-900 text-center mb-3 md:mb-4">
          Collections
        </p>
        <CollectionCoverLink
          slug={HERO_SLUG}
          className="w-full aspect-[16/10] md:aspect-[16/9] lg:aspect-[21/9]"
        />
      </div>

      <div className="layout-bleed-full px-4 md:px-8 pb-4 md:pb-6">
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {GRID_SLUGS.map((slug) => (
            <CollectionCoverLink
              key={slug}
              slug={slug}
              compact
              className="aspect-square"
            />
          ))}
        </div>
      </div>

      <nav
        className="px-4 md:px-8 py-8 md:py-10 border-t border-neutral-200/70"
        aria-label="All collections"
      >
        <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-4">
          All edits
        </p>
        <ul className="flex flex-col gap-0 divide-y divide-neutral-200/80 max-w-2xl">
          {COLLECTION_SECTIONS.map((collection) => (
            <li key={collection.slug}>
              <Link
                href={collection.href}
                className="flex items-center justify-between py-4 group"
                data-testid={`link-collection-list-${collection.slug}`}
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400 mb-1">
                    {collection.kicker}
                  </p>
                  <p className="text-[15px] md:text-[16px] font-serif text-neutral-900 group-hover:text-neutral-600 transition-colors">
                    {collection.label}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-neutral-400 group-hover:text-neutral-800 transition-colors">
                  Shop
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
