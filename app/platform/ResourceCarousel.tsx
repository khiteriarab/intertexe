"use client";

import { useState } from "react";
import Link from "next/link";
import { DEFAULT_APP_STORE_URL } from "../../lib/app-store";
import { getChromeWebStoreUrl } from "../../lib/chrome-extension";
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
    primary: { href: getChromeWebStoreUrl(), label: "Add to Chrome" },
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
  const surface = SURFACES[active];

  const go = (index: number) => {
    setActive((index + SURFACES.length) % SURFACES.length);
  };

  return (
    <section className="py-10 sm:py-14 md:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-4">
          Latest product surfaces
        </p>
        <h2 className="text-[1.75rem] sm:text-3xl md:text-4xl font-light leading-[1.2] max-w-2xl mb-8" style={SERIF}>
          Keep up with the latest <em className="italic font-normal">INTERTEXE surfaces</em>.
        </h2>

        <div
          role="tablist"
          aria-label="INTERTEXE product surfaces"
          className="flex flex-wrap gap-2 sm:gap-3 mb-8"
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
                onClick={() => go(index)}
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

        <div
          id="surface-panel"
          role="tabpanel"
          aria-labelledby={`surface-tab-${surface.id}`}
          className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-6 lg:gap-10 items-center"
        >
          <blockquote className="order-2 lg:order-1 min-w-0">
            <p
              className="text-[1.45rem] sm:text-[1.7rem] font-normal italic leading-[1.3] text-[#152238]"
              style={SERIF}
            >
              {surface.quote}
            </p>
          </blockquote>

          <div className="order-1 lg:order-2 relative min-w-0">
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="Previous surface"
              className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 hidden sm:inline-flex w-11 h-11 border border-[#152238] text-[#152238] bg-[#f7f5f1] items-center justify-center hover:bg-white"
            >
              ←
            </button>
            <div className="relative overflow-hidden rounded-2xl bg-[#152238] aspect-[4/3] shadow-[0_20px_50px_rgba(21,34,56,0.14)]">
              {SURFACES.map((item, index) => (
                <img
                  key={item.id}
                  src={item.image}
                  alt={index === active ? item.alt : ""}
                  width={1600}
                  height={1200}
                  className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
                    index === active ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Next surface"
              className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 hidden sm:inline-flex w-11 h-11 border border-[#152238] text-[#152238] bg-[#f7f5f1] items-center justify-center hover:bg-white"
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

          <div className="order-3 min-w-0">
            <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-3">{surface.tab}</p>
            <h3 className="text-xl sm:text-2xl leading-snug text-[#152238] mb-3" style={SERIF}>
              {surface.heading}
            </h3>
            <p className="text-[15px] text-[#5c5854] font-light leading-relaxed mb-6">{surface.copy}</p>
            <Link
              href={surface.primary.href}
              className="inline-flex items-center justify-center rounded-md bg-[#152238] text-white text-[12px] tracking-[0.04em] px-6 py-3.5 min-h-[44px] hover:bg-[#0f1a2c]"
            >
              {surface.primary.label} →
            </Link>
            <div className="mt-3">
              <Link
                href={surface.secondary.href}
                className="inline-flex items-center min-h-[44px] text-[13px] text-[#152238] hover:underline underline-offset-4"
              >
                {surface.secondary.label} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
