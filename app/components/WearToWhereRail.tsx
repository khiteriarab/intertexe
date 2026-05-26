"use client";

import Link from "next/link";
import type { CollectionSlug } from "../../lib/collection-pages";
import { COLLECTION_SECTIONS } from "../../lib/site-architecture";
import { editorialHeroForSlug } from "../../lib/editorial-assets";
import { wearToWhereCardsForCollection, type WearToWhereCard } from "../../lib/wear-to-where";

function WearToWhereCardTile({ card }: { card: WearToWhereCard }) {
  const inner = (
    <>
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#eae8e4]">
        <img
          src={card.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
          loading="lazy"
          draggable={false}
        />
      </div>
      <div className="flex flex-col gap-0.5 px-0.5">
        {card.kicker && (
          <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{card.kicker}</span>
        )}
        <span className="text-[13px] md:text-[14px] font-serif leading-snug group-hover:text-muted-foreground transition-colors">
          {card.label}
        </span>
      </div>
    </>
  );

  if (card.editorialOnly || card.href === "#") {
    return (
      <div
        className="group flex-shrink-0 w-[140px] md:w-[168px] flex flex-col gap-2"
        data-testid={`wear-to-where-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={card.href}
      className="group flex-shrink-0 w-[140px] md:w-[168px] flex flex-col gap-2"
      data-testid={`wear-to-where-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {inner}
    </Link>
  );
}

/** Horizontal "Wear to where?" carousel — moods for a collection or all editorial worlds. */
export function WearToWhereRail({
  collectionSlug,
  title = "Wear to where?",
  cards: cardsProp,
  className = "",
}: {
  collectionSlug?: CollectionSlug;
  title?: string;
  cards?: WearToWhereCard[];
  className?: string;
}) {
  const cards =
    cardsProp ??
    (collectionSlug
      ? wearToWhereCardsForCollection(collectionSlug)
      : COLLECTION_SECTIONS.map((c) => ({
          href: c.href,
          label: c.label,
          kicker: c.kicker,
          imageUrl: editorialHeroForSlug(c.slug),
        })));

  if (!cards.length) return null;

  return (
    <section className={`py-6 md:py-8 ${className}`} data-testid="section-wear-to-where">
      <p className="text-[10px] md:text-[11px] uppercase tracking-[0.32em] text-center text-muted-foreground mb-5 md:mb-6">
        {title}
      </p>
      <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-8 md:px-8 pb-1">
        {cards.map((card) => (
          <WearToWhereCardTile key={card.href} card={card} />
        ))}
      </div>
    </section>
  );
}
