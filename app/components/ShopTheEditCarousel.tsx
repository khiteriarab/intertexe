"use client";

import Link from "next/link";
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

/** Seconds for one full marquee loop (lower = faster). */
const MARQUEE_SECONDS_PER_SLIDE = 2.8;

export function ShopTheEditCarousel({
  slides = DEFAULT_SLIDES,
}: {
  slides?: EditCarouselSlide[];
  autoPlayMs?: number;
}) {
  if (slides.length === 0) return null;

  const loop = [...slides, ...slides];
  const durationSec = Math.max(12, slides.length * MARQUEE_SECONDS_PER_SLIDE);

  return (
    <div className="w-full" data-testid="shop-the-edit-carousel">
      <style>{`
        @keyframes shop-edit-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .shop-edit-marquee-track {
          animation: shop-edit-marquee ${durationSec}s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .shop-edit-marquee-track {
            animation: none;
          }
        }
      `}</style>

      <div className="relative overflow-hidden bg-[#1c1c1c] h-[min(90svh,100vw)] lg:h-[min(92svh,78vw)]">
        <div className="shop-edit-marquee-track flex h-full w-max">
          {loop.map((slide, i) => {
            const imageUrl = slide.imageUrl || editorialHeroForSlug(slide.slug);
            return (
              <Link
                key={`${slide.slug}-${i}`}
                href={slide.href}
                className="relative flex-shrink-0 block h-full w-[72vw] sm:w-[58vw] lg:w-[42vw] xl:w-[38vw]"
                data-testid={`edit-slide-${slide.slug}`}
                draggable={false}
              >
                <img
                  src={imageUrl}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
                  loading={i < slides.length ? "eager" : "lazy"}
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 lg:px-8 lg:pb-8 pointer-events-none">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/65 mb-1">
                    {slide.kicker}
                  </p>
                  <p className="font-serif text-[22px] lg:text-[28px] text-white leading-tight break-words">
                    {slide.title}
                  </p>
                  <p className="text-[11px] font-light text-white/75 leading-snug mt-1 line-clamp-2">
                    {slide.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
