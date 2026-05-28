"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CollectionSlug } from "../../lib/collection-pages";
import { COLLECTION_SECTIONS } from "../../lib/site-architecture";
import { editorialHeroForSlug } from "../../lib/editorial-assets";
import { wearToWhereCardsForCollection, type WearToWhereCard } from "../../lib/wear-to-where";
import {
  HORIZONTAL_RAIL_COLLECTION_TILE_CLASS,
  HORIZONTAL_RAIL_INSET_CLASS,
} from "../../lib/horizontal-rail";

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
        className={`group ${HORIZONTAL_RAIL_COLLECTION_TILE_CLASS} flex flex-col gap-2`}
        data-testid={`wear-to-where-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
        data-rail-card
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={card.href}
      className={`group ${HORIZONTAL_RAIL_COLLECTION_TILE_CLASS} flex flex-col gap-2`}
      data-testid={`wear-to-where-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
      data-rail-card
      draggable={false}
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  };

  if (!cards.length) return null;

  return (
    <section className={`py-6 md:py-8 ${className}`} data-testid="section-wear-to-where">
      <div className="flex items-center justify-center gap-4 mb-5 md:mb-6 px-4">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="w-9 h-9 border border-neutral-200 flex items-center justify-center hover:border-neutral-400 transition-colors shrink-0"
          aria-label="Scroll collections left"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <p className="text-[10px] md:text-[11px] uppercase tracking-[0.32em] text-center text-muted-foreground flex-1">
          {title}
        </p>
        <button
          type="button"
          onClick={() => scroll("right")}
          className="w-9 h-9 border border-neutral-200 flex items-center justify-center hover:border-neutral-400 transition-colors shrink-0"
          aria-label="Scroll collections right"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div ref={scrollRef} className={`${HORIZONTAL_RAIL_INSET_CLASS} gap-3 md:gap-4`}>
        {cards.map((card) => (
          <WearToWhereCardTile key={card.href} card={card} />
        ))}
      </div>
    </section>
  );
}
