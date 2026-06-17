"use client";

import Link from "next/link";
import { COLLECTION_SECTIONS } from "../../lib/site-architecture";
import { editorialHeroForSlug } from "../../lib/editorial-assets";
import { ShopTheEditCarousel } from "../components/ShopTheEditCarousel";

const slides = COLLECTION_SECTIONS.map((collection) => ({
  slug: collection.slug,
  title: collection.label,
  kicker: collection.kicker,
  subtitle: collection.subtitle,
  href: collection.href,
  imageUrl: editorialHeroForSlug(collection.slug),
}));

export function CollectionsEditClient() {
  return (
    <div className="flex flex-col w-full" data-testid="page-collections-edit">
      <div className="layout-bleed-full">
        <ShopTheEditCarousel slides={slides} />
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
                data-testid={`link-collection-${collection.slug}`}
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
