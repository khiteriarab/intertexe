"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

function SlideImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="eager"
      draggable={false}
    />
  );
}

function EditOverlay({
  slide,
  className = "",
}: {
  slide: EditCarouselSlide;
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end px-5 pb-20 lg:pb-10 md:px-10 pointer-events-none ${className}`}
    >
      <div className="pointer-events-auto max-w-md">
        <h2 className="text-[28px] md:text-[40px] lg:text-[44px] font-serif text-white leading-[1.08] mb-2 md:mb-3">
          {slide.title}
        </h2>
        <p className="text-[13px] md:text-[15px] text-white/85 leading-relaxed font-light mb-5 md:mb-6 max-w-sm">
          {slide.subtitle}
        </p>
        <span className="inline-flex w-full md:w-auto items-center justify-center bg-white text-neutral-900 px-8 py-3.5 md:py-4 text-[11px] md:text-[12px] uppercase tracking-[0.12em] font-medium hover:bg-white/95 transition-colors">
          Shop the edit
        </span>
      </div>
    </div>
  );
}

export function ShopTheEditCarousel({
  slides = DEFAULT_SLIDES,
  autoPlayMs = 5000,
}: {
  slides?: EditCarouselSlide[];
  autoPlayMs?: number;
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

  const active = slides[index];
  const next = slides[(index + 1) % count];

  if (!active || count === 0) return null;

  return (
    <div
      className="w-full"
      data-testid="shop-the-edit-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Mobile — peek of next slide, bottom overlay, pill nav */}
      <div
        className="lg:hidden relative overflow-hidden bg-[#1c1c1c]"
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) return;
          const delta = (e.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(delta) < 40) {
            window.setTimeout(() => setPaused(false), 2000);
            return;
          }
          if (delta < 0) goNext();
          else goPrev();
          window.setTimeout(() => setPaused(false), 3000);
        }}
      >
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(calc(-${index} * 88vw))` }}
        >
          {slides.map((slide, i) => {
            const imageUrl = slide.imageUrl || editorialHeroForSlug(slide.slug);
            return (
              <div
                key={slide.slug}
                className="relative flex-shrink-0 w-[88vw] h-[min(72svh,560px)]"
                aria-hidden={i !== index}
              >
                <Link
                  href={slide.href}
                  className="block absolute inset-0"
                  tabIndex={i === index ? 0 : -1}
                  data-testid={`edit-slide-${slide.slug}`}
                >
                  <SlideImage
                    src={imageUrl}
                    alt={slide.title}
                    className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent pointer-events-none" />
                  {i === index && <EditOverlay slide={slide} />}
                </Link>
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <div className="absolute bottom-6 left-5 z-30 flex items-center gap-0 rounded-full border border-white/25 bg-black/30 backdrop-blur-sm overflow-hidden">
            <button
              type="button"
              onClick={goPrev}
              className="w-11 h-11 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              aria-label="Previous edit"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="w-11 h-11 flex items-center justify-center text-white hover:bg-white/10 transition-colors border-l border-white/20"
              aria-label="Next edit"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Desktop — split panel: active edit left, next peek right */}
      <div className="hidden lg:grid lg:grid-cols-2 min-h-[min(72vh,680px)] max-h-[760px]">
        <div className="relative overflow-hidden bg-[#1c1c1c]">
          <Link
            href={active.href}
            className="block absolute inset-0 transition-opacity duration-700"
            data-testid={`edit-slide-${active.slug}`}
          >
            <SlideImage
              src={active.imageUrl || editorialHeroForSlug(active.slug)}
              alt={active.title}
              className="absolute inset-0 w-full h-full object-cover object-[center_32%] transition-opacity duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5 pointer-events-none" />
            <EditOverlay slide={active} />
          </Link>
        </div>

        <div className="relative overflow-hidden bg-[#1c1c1c]">
          {next && (
            <Link
              href={next.href}
              className="block absolute inset-0"
              aria-label={`Next: ${next.title}`}
            >
              <SlideImage
                src={next.imageUrl || editorialHeroForSlug(next.slug)}
                alt={next.title}
                className="absolute inset-0 w-full h-full object-cover object-[center_32%] transition-opacity duration-700"
              />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
