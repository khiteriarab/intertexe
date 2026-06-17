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

/** Short overlay copy for the carousel — matches NAP one-line subtext. */
export const EDIT_CAROUSEL_SHORT_SUBTITLES: Record<string, string> = Object.fromEntries(
  DEFAULT_SLIDES.map((slide) => [slide.slug, slide.subtitle])
);

function useIsLargeScreen() {
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isLg;
}

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

function EditOverlay({ slide }: { slide: EditCarouselSlide }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end px-6 pb-24 lg:px-10 lg:pb-12 pointer-events-none">
      <div className="pointer-events-auto max-w-md">
        <h2 className="text-[30px] lg:text-[42px] xl:text-[46px] font-serif text-white leading-[1.08] mb-2 lg:mb-3">
          {slide.title}
        </h2>
        <p className="text-[13px] lg:text-[15px] text-white/85 leading-relaxed font-light mb-5 lg:mb-6 max-w-sm line-clamp-3">
          {slide.subtitle}
        </p>
        <span className="inline-flex w-full lg:w-auto items-center justify-center bg-white text-neutral-900 px-8 py-3.5 lg:py-4 text-[11px] lg:text-[12px] uppercase tracking-[0.12em] font-medium hover:bg-white/95 transition-colors">
          Shop the edit
        </span>
      </div>
    </div>
  );
}

/** NAP-style center-peak carousel — tall square-ish panels with side peek. */
const MOBILE_SLIDE_VW = 90;
const DESKTOP_SLIDE_VW = 54;

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
  const isLg = useIsLargeScreen();
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

  if (count === 0) return null;

  const slideVw = isLg ? DESKTOP_SLIDE_VW : MOBILE_SLIDE_VW;
  const trackTransform = isLg
    ? `translateX(calc(50vw - ${index * slideVw + slideVw / 2}vw))`
    : `translateX(calc(-${index * slideVw}vw + ${(100 - slideVw) / 2}vw))`;

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
        className="relative overflow-hidden bg-[#1c1c1c] h-[min(90svh,100vw)] lg:h-[min(92svh,78vw)]"
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
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ transform: trackTransform }}
        >
          {slides.map((slide, i) => {
            const imageUrl = slide.imageUrl || editorialHeroForSlug(slide.slug);
            const active = i === index;
            return (
              <div
                key={slide.slug}
                className="relative flex-shrink-0 h-full w-[90vw] lg:w-[54vw]"
                aria-hidden={!active}
              >
                <Link
                  href={slide.href}
                  className="block absolute inset-0"
                  tabIndex={active ? 0 : -1}
                  data-testid={`edit-slide-${slide.slug}`}
                  onClick={(e) => {
                    if (!active && isLg) {
                      e.preventDefault();
                      goTo(i);
                    }
                  }}
                >
                  <SlideImage
                    src={imageUrl}
                    alt={slide.title}
                    className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                  {active && <EditOverlay slide={slide} />}
                </Link>
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <div className="absolute bottom-6 left-5 lg:bottom-8 lg:left-8 z-30 flex items-center gap-0 rounded-full border border-white/25 bg-black/30 backdrop-blur-sm overflow-hidden">
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
    </div>
  );
}
