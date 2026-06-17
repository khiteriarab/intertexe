"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { editorialHeroForSlug } from "../../lib/editorial-assets";

export type EditCarouselSlide = {
  slug: string;
  title: string;
  kicker: string;
  subtitle: string;
  href: string;
  imageUrl?: string;
};

const DEFAULT_SLIDES: EditCarouselSlide[] = [
  {
    slug: "vacation",
    title: "Vacation",
    kicker: "Resort",
    subtitle: "Linen that moves. Silk at sunset.",
    href: "/collections/vacation",
  },
  {
    slug: "evening",
    title: "Evening",
    kicker: "After dark",
    subtitle: "For the occasion that deserves the real thing.",
    href: "/collections/evening",
  },
  {
    slug: "tailoring",
    title: "Tailoring",
    kicker: "Structure",
    subtitle: "The pieces that outlast every trend.",
    href: "/collections/tailoring",
  },
  {
    slug: "summer-in-the-city",
    title: "Summer in the City",
    kicker: "Urban",
    subtitle: "Downtown luxury. Lightweight. Breathable.",
    href: "/collections/summer-in-the-city",
  },
  {
    slug: "white-edit",
    title: "The White Edit",
    kicker: "Monochrome",
    subtitle: "White in every form. Ivory. Chalk. Cream.",
    href: "/collections/white-edit",
  },
].map((slide) => ({
  ...slide,
  imageUrl: editorialHeroForSlug(slide.slug),
}));

function slideImageSrc(url: string): string {
  return url.trim();
}

export function ShopTheEditCarousel({
  slides = DEFAULT_SLIDES,
  autoPlayMs = 5000,
  variant = "full",
}: {
  slides?: EditCarouselSlide[];
  autoPlayMs?: number;
  variant?: "full" | "compact";
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, autoPlayMs);
    return () => window.clearInterval(timer);
  }, [paused, count, autoPlayMs]);

  const heightClass =
    variant === "compact"
      ? "min-h-[52svh] md:min-h-[58vh]"
      : "min-h-[72svh] md:min-h-[min(78vh,720px)]";

  return (
    <div
      className="w-full"
      data-testid="shop-the-edit-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className={`relative overflow-hidden bg-[#1c1c1c] ${heightClass}`}
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) return;
          const delta = (e.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(delta) < 40) return;
          if (delta < 0) goNext();
          else goPrev();
        }}
      >
        {slides.map((slide, i) => {
          const imageUrl = slide.imageUrl || editorialHeroForSlug(slide.slug);
          const active = i === index;
          return (
            <Link
              key={slide.slug}
              href={slide.href}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
              aria-hidden={!active}
              tabIndex={active ? 0 : -1}
              data-testid={`edit-slide-${slide.slug}`}
            >
              <img
                src={slideImageSrc(imageUrl)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-[center_28%] md:object-[center_32%]"
                loading={i === 0 ? "eager" : "lazy"}
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end px-6 md:px-14 pb-10 md:pb-14 max-w-2xl">
                <p className="text-[10px] md:text-[11px] uppercase tracking-[0.28em] text-white/60 mb-2">
                  {slide.kicker}
                </p>
                <h2 className="text-[32px] md:text-[48px] font-serif text-white leading-[1.05] mb-2 md:mb-3">
                  {slide.title}
                </h2>
                <p className="text-[13px] md:text-[15px] text-white/78 leading-relaxed max-w-md font-light mb-4 md:mb-5">
                  {slide.subtitle}
                </p>
                <span className="inline-flex items-center gap-2 text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-white/85">
                  Shop the edit <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white hover:bg-black/40 transition-colors"
              aria-label="Previous edit"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white hover:bg-black/40 transition-colors"
              aria-label="Next edit"
            >
              ›
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center gap-2 py-4 md:py-5">
          {slides.map((slide, i) => (
            <button
              key={slide.slug}
              type="button"
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-neutral-900" : "w-1.5 bg-neutral-300 hover:bg-neutral-500"
              }`}
              aria-label={`View ${slide.title}`}
              aria-current={i === index ? "true" : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
