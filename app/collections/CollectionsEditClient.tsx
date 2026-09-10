"use client";

import Link from "next/link";
import {
  COLLECTIONS_MENU,
  getCollectionManifestItem,
} from "../../lib/collections-manifest";
import { COLLECTION_SECTIONS } from "../../lib/site-architecture";
import { editorialHeroForSlug } from "../../lib/editorial-assets";

const HERO_SLUG = COLLECTIONS_MENU.heroSlug;
const GRID_SLUGS = COLLECTIONS_MENU.gridSlugs;

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
  const manifestItem = getCollectionManifestItem(slug);
  const subtitle = compact
    ? manifestItem?.gridSubline ?? collection.subtitle
    : manifestItem?.subline ?? collection.subtitle;

  return (
    <Link
      href={collection.href}
      className="group block w-full touch-manipulation cursor-pointer"
      data-testid={`link-collection-${slug}`}
    >
      <div className={`relative w-full overflow-hidden bg-[#1c1c1c] ${className}`}>
      <img
        src={imageUrl}
        alt={collection.label}
        className="absolute inset-0 h-full w-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-700"
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
        {!compact ? (
          <span className="inline-flex items-center gap-2 mt-4 text-[10px] uppercase tracking-[0.2em] text-white/70 group-hover:text-white group-hover:gap-3 transition-all">
            Shop collection →
          </span>
        ) : null}
      </div>
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

      <div className="layout-bleed-full px-4 md:px-8 pb-8 md:pb-10">
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {GRID_SLUGS.map((slug) => (
            <CollectionCoverLink
              key={slug}
              slug={slug}
              compact
              className="aspect-[3/4]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
