"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_APP_STORE_URL } from "../../lib/app-store";
import { SERIF } from "./platform-ui";

const SURFACES = [
  {
    id: "chrome",
    tab: "Chrome extension",
    quote: "Read composition while you shop.",
    heading: "Fabric Scanner on the product page.",
    copy: "The extension sits beside the retailer listing and finds better-material matches. It is not required to open a Digital Product Passport.",
    image: "/platform/surface-chrome-laptop.jpg",
    alt: "Laptop showing INTERTEXE Fabric Scanner on a sample product page. Illustrative — not a retailer partnership.",
    primary: { href: "/extension/download", label: "Add to Chrome" },
    secondary: { href: "/platform/demo", label: "See how it works" },
  },
  {
    id: "iphone",
    tab: "iPhone app",
    quote: "Shop by silk, linen, cotton, wool.",
    heading: "The consumer app is live.",
    copy: "Point at a tag, care label, or product page to decode composition and discover better alternatives. Composition first — not a moodboard.",
    image: "/platform/surface-iphone-scanner.jpg",
    alt: "iPhone showing the INTERTEXE scanner reading a garment tag. Illustrative UI of the live consumer app.",
    primary: { href: DEFAULT_APP_STORE_URL, label: "Open the app" },
    secondary: { href: "/shop", label: "Shop the catalog" },
  },
  {
    id: "platform",
    tab: "Platform",
    quote: "Material intelligence for the catalog.",
    heading: "Ingest, normalize, keep the source string.",
    copy: "One workspace for the records brands already have. Original values stay on every product. Sample workspace — not a live customer catalog.",
    image: "/platform/surface-platform-laptop.jpg",
    alt: "Laptop showing the INTERTEXE Enterprise workspace for Dress 8721. Illustrative sample, not a live customer.",
    primary: { href: "/platform/discover", label: "Discover the workspace" },
    secondary: { href: "/platform/request?intent=snapshot", label: "See it with your products" },
  },
] as const;

export function ResourceCarousel() {
  const [active, setActive] = useState(0);
  const sentinels = useRef<Array<HTMLDivElement | null>>([]);
  const skipObserver = useRef(false);

  const go = useCallback((index: number, scroll = false) => {
    const next = (index + SURFACES.length) % SURFACES.length;
    setActive(next);
    if (!scroll) return;
    skipObserver.current = true;
    sentinels.current[next]?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      skipObserver.current = false;
    }, 700);
  }, []);

  useEffect(() => {
    const nodes = sentinels.current.filter((node): node is HTMLDivElement => Boolean(node));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (skipObserver.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.index);
        if (Number.isInteger(index)) setActive(index);
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const surface = SURFACES[active];

  return (
    <section className="relative py-10 sm:py-16 md:py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mb-10 sm:mb-14">
        <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-4">
          Latest product surfaces
        </p>
        <h2 className="text-[1.75rem] sm:text-3xl md:text-4xl font-light leading-[1.2] max-w-xl" style={SERIF}>
          Keep up with the latest <em className="italic font-normal">INTERTEXE surfaces</em>.
        </h2>
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute left-1/2 top-0 bottom-0 hidden lg:block w-px bg-[#152238]/20"
          aria-hidden="true"
        />

        <div
          role="tablist"
          aria-label="INTERTEXE product surfaces"
          className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 mb-10 sm:mb-14 flex flex-wrap justify-center gap-2 sm:gap-3"
        >
          {SURFACES.map((item, index) => {
            const selected = index === active;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`surface-tab-${item.id}`}
                aria-selected={selected}
                aria-controls="surface-panel"
                onClick={() => go(index, true)}
                className={`min-h-[44px] rounded-full px-5 sm:px-7 text-[11px] tracking-[0.14em] uppercase transition-colors ${
                  selected
                    ? "bg-[#152238] text-white"
                    : "bg-[#ece8e1] text-[#5c5854] hover:bg-[#e2ddd4]"
                }`}
              >
                {item.tab}
              </button>
            );
          })}
        </div>

        <div className="relative lg:h-[210vh]">
          <div className="lg:sticky lg:top-16 lg:h-[calc(100vh-5rem)] lg:flex lg:items-center z-10 bg-[#f7f5f1]">
            <div
              id="surface-panel"
              role="tabpanel"
              aria-labelledby={`surface-tab-${surface.id}`}
              className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 grid lg:grid-cols-[1fr_minmax(240px,340px)_1fr] gap-8 lg:gap-6 items-center py-4 lg:py-0"
            >
              <blockquote className="order-2 lg:order-1 max-w-md lg:pr-4">
                <p
                  className="text-[1.65rem] sm:text-[1.85rem] md:text-[2.05rem] font-normal italic leading-[1.25] text-[#152238]"
                  style={SERIF}
                >
                  {surface.quote}
                </p>
              </blockquote>

              <div className="order-1 lg:order-2 relative mx-auto w-full max-w-[340px]">
                <button
                  type="button"
                  onClick={() => go(active - 1, true)}
                  aria-label="Previous surface"
                  className="absolute -left-12 sm:-left-14 top-1/2 -translate-y-1/2 z-20 hidden sm:inline-flex w-11 h-11 border border-[#152238] text-[#152238] bg-[#f7f5f1] items-center justify-center hover:bg-white"
                >
                  ←
                </button>
                <div className="relative rounded-[28px] overflow-hidden bg-[#152238] aspect-[3/4] shadow-[0_28px_70px_rgba(21,34,56,0.18)]">
                  {SURFACES.map((item, index) => (
                    <img
                      key={item.id}
                      src={item.image}
                      alt={index === active ? item.alt : ""}
                      width={1200}
                      height={1600}
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                        index === active ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => go(active + 1, true)}
                  aria-label="Next surface"
                  className="absolute -right-12 sm:-right-14 top-1/2 -translate-y-1/2 z-20 hidden sm:inline-flex w-11 h-11 border border-[#152238] text-[#152238] bg-[#f7f5f1] items-center justify-center hover:bg-white"
                >
                  →
                </button>
                <div className="sm:hidden mt-4 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => go(active - 1)}
                    aria-label="Previous surface"
                    className="w-11 h-11 border border-[#152238] text-[#152238] inline-flex items-center justify-center"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => go(active + 1)}
                    aria-label="Next surface"
                    className="w-11 h-11 border border-[#152238] text-[#152238] inline-flex items-center justify-center"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="order-3 max-w-md lg:pl-4">
                <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-3">{surface.tab}</p>
                <h3 className="text-2xl sm:text-[1.7rem] leading-snug text-[#152238] mb-4" style={SERIF}>
                  {surface.heading}
                </h3>
                <p className="text-[15px] text-[#5c5854] font-light leading-relaxed mb-7">{surface.copy}</p>
                <Link
                  href={surface.primary.href}
                  className="inline-flex items-center justify-center rounded-md bg-[#152238] text-white text-[12px] tracking-[0.04em] px-6 py-3.5 min-h-[44px] hover:bg-[#0f1a2c]"
                >
                  {surface.primary.label} →
                </Link>
                <div className="mt-4">
                  <Link
                    href={surface.secondary.href}
                    className="inline-flex items-center text-[13px] text-[#152238] hover:underline underline-offset-4"
                  >
                    {surface.secondary.label} →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 hidden lg:grid grid-rows-3" aria-hidden="true">
            {SURFACES.map((item, index) => (
              <div
                key={item.id}
                ref={(node) => {
                  sentinels.current[index] = node;
                }}
                data-index={index}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
