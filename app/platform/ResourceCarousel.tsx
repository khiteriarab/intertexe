"use client";

import { useRef } from "react";
import Link from "next/link";
import { SERIF } from "./platform-ui";

const CARDS = [
  {
    tag: "Chrome extension",
    title: "Read composition while you shop",
    copy: "Fabric Scanner sits on the product page and finds better-material matches.",
    href: "/platform/demo",
    tone: "#d9c9a6",
  },
  {
    tag: "iPhone app",
    title: "Shop by silk, linen, cotton, wool",
    copy: "The consumer app is live. Composition first — not a moodboard.",
    href: "/shop",
    tone: "#c5d4c8",
  },
  {
    tag: "Workspace",
    title: "Material intelligence for the catalog",
    copy: "Ingest, normalize, and keep original source strings on every record.",
    href: "/platform/demo",
    tone: "#c9b8d4",
  },
  {
    tag: "Issues inbox",
    title: "Conflicts stay visible",
    copy: "Dress 8721 still shows the label vs supplier disagreement. Nothing is overwritten.",
    href: "/platform/demo",
    tone: "#e2c9c9",
  },
  {
    tag: "Benchmark",
    title: "Your mix against a peer group",
    copy: "Natural, synthetic, completeness, passport-ready. Consumer signal coming / developing.",
    href: "/platform/demo",
    tone: "#7d9bb8",
  },
  {
    tag: "Passports",
    title: "Publish when the record is ready",
    copy: "QR and hosted passport from the same data. The INTERTEXE scanner is not required.",
    href: "/platform/demo",
    tone: "#1d4734",
  },
] as const;

export function ResourceCarousel() {
  const scroller = useRef<HTMLDivElement>(null);

  const move = (direction: -1 | 1) => {
    scroller.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  };

  return (
    <section className="py-10 sm:py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-4">
            Latest product surfaces
          </p>
          <h2 className="text-[1.75rem] sm:text-3xl md:text-4xl font-light leading-[1.2] max-w-xl" style={SERIF}>
            Keep up with the latest <em className="italic font-normal">INTERTEXE surfaces</em>.
          </h2>
        </div>
        <Link
          href="/platform/demo"
          className="inline-flex items-center justify-center text-[11px] tracking-[0.14em] uppercase bg-[#1d4734] text-white px-7 py-3.5 min-h-[44px] shrink-0"
        >
          View all →
        </Link>
      </div>
      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto px-4 sm:px-6 md:px-8 pb-4 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CARDS.map((card) => (
          <article
            key={card.tag}
            className="snap-start shrink-0 w-[260px] sm:w-[280px]"
          >
            <div className="relative mb-4">
              <div className="h-[150px] rounded-md" style={{ background: card.tone }} />
              <span className="absolute left-3 -bottom-3 bg-white border border-[#161513] text-[10px] tracking-[0.08em] uppercase px-3 py-1.5">
                {card.tag}
              </span>
            </div>
            <h3 className="text-lg mt-6 mb-2 leading-snug" style={SERIF}>
              {card.title}
            </h3>
            <p className="text-sm text-[#5c5854] leading-relaxed mb-4">{card.copy}</p>
            <Link href={card.href} className="text-[12px] text-[#1d4734] inline-flex items-center gap-1">
              Read more <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Previous surfaces"
          className="w-11 h-11 border border-[#1d4734] text-[#1d4734] inline-flex items-center justify-center"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Next surfaces"
          className="w-11 h-11 border border-[#1d4734] text-[#1d4734] inline-flex items-center justify-center"
        >
          →
        </button>
      </div>
    </section>
  );
}
