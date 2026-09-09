"use client";

import type { RefObject } from "react";
import { ArrowRight } from "lucide-react";
import { getAppStoreUrl } from "../../lib/app-store";
import { getChromeWebStoreUrl } from "../../lib/chrome-extension";
import { AppStoreCtaLink } from "./AppStoreCtaLink";
import { useReducedMotion, useScrollSteps } from "../platform/b2b-motion";
import { HomeChromeExtensionVisual } from "./home-promo/HomeChromeExtensionVisual";
import { HomeIosScannerVisual } from "./home-promo/HomeIosScannerVisual";

const SLIDES = [
  {
    id: "ios",
    kicker: "INTERTEXE for iOS",
    title: "Scan fabrics",
    emphasis: "in stores",
    description:
      "Point your camera at any care label or barcode. Get fiber composition instantly and discover verified natural-fiber alternatives while you shop.",
    visualLabel: "Interactive iOS scanner: scan a tag, read composition, find better-material matches",
    href: getAppStoreUrl(),
    ctaLabel: "Download the app",
    testId: "link-home-app-scanner",
    cta: "app_store" as const,
  },
  {
    id: "chrome",
    kicker: "INTERTEXE for Chrome",
    title: "Find better-material matches",
    emphasis: "while you browse",
    description:
      "Shop anywhere on the web. The extension surfaces similar pieces with better fabrics and prices — without leaving the retailer page.",
    visualLabel: "Interactive Chrome extension: filter better-material matches on any retailer product page",
    href: getChromeWebStoreUrl(),
    ctaLabel: "Add to Chrome",
    testId: "link-home-chrome-extension",
    cta: "external" as const,
  },
] as const;

function SlideVisual({
  slideId,
  active,
}: {
  slideId: (typeof SLIDES)[number]["id"];
  active: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
        active ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-[0.98] pointer-events-none"
      }`}
      aria-hidden={!active}
    >
      {slideId === "ios" ? <HomeIosScannerVisual /> : <HomeChromeExtensionVisual />}
    </div>
  );
}

function SlideCopy({
  slide,
  showCta = true,
}: {
  slide: (typeof SLIDES)[number];
  showCta?: boolean;
}) {
  const ctaClass =
    "inline-flex items-center gap-2 border border-neutral-800 text-neutral-800 px-6 py-3 uppercase tracking-[0.18em] text-[10px] md:text-[11px] font-light hover:bg-neutral-800 hover:text-white transition-all duration-300 active:scale-[0.97]";

  const cta =
    slide.cta === "app_store" ? (
      <AppStoreCtaLink appStoreUrl={slide.href} cta={slide.testId} className={ctaClass} testId={slide.testId}>
        {slide.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
      </AppStoreCtaLink>
    ) : (
      <a
        href={slide.href}
        target="_blank"
        rel="noopener noreferrer"
        className={ctaClass}
        data-testid={slide.testId}
      >
        {slide.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
      </a>
    );

  return (
    <div className="flex flex-col gap-4 md:gap-5 max-w-md">
      <p className="text-[9px] md:text-[10px] uppercase tracking-[0.35em] text-neutral-400">{slide.kicker}</p>
      <h3 className="text-[32px] md:text-[44px] lg:text-[48px] font-serif leading-[1.08] tracking-[-0.01em]">
        {slide.title}{" "}
        <em className="not-italic font-serif italic text-neutral-800">{slide.emphasis}</em>
      </h3>
      <p className="text-neutral-500 text-[14px] md:text-[16px] leading-relaxed font-light">{slide.description}</p>
      {showCta ? cta : null}
    </div>
  );
}

/** App scanner + Chrome extension — Phia-style sticky scroll showcase. */
export function HomepageProductToolsSection() {
  const [scrollRef, activeStep] = useScrollSteps(SLIDES.length);
  const reduced = useReducedMotion();

  return (
    <section
      className="border-t border-neutral-200/60 py-16 md:py-24 px-4 md:px-8 overflow-hidden"
      data-testid="homepage-product-tools"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 md:gap-5 text-center md:text-left max-w-2xl mb-12 md:mb-16">
          <p className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-neutral-400">Shop with confidence</p>
          <h2 className="text-[28px] md:text-[44px] font-serif leading-[1.1]">
            Scan fabrics in stores. <em className="not-italic italic">Shop smarter online.</em>
          </h2>
          <p className="text-neutral-500 text-[13px] md:text-[16px] leading-relaxed font-light">
            The INTERTEXE fabric scanner reads care labels and barcodes in seconds — then finds better-material matches
            at similar prices, in the app or on Chrome.
          </p>
        </div>

        <div ref={scrollRef as RefObject<HTMLDivElement>} className="relative">
          <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-10 lg:gap-16">
            <div className="relative z-[1]">
              {SLIDES.map((slide, index) => (
                <article
                  key={slide.id}
                  className="min-h-[72vh] lg:min-h-[88vh] flex flex-col justify-center py-10 lg:py-16"
                  aria-current={activeStep === index ? "step" : undefined}
                >
                  <div className="lg:hidden mb-8">
                    <div
                      className="relative mx-auto w-full max-w-[520px] min-h-[420px]"
                      role="img"
                      aria-label={slide.visualLabel}
                    >
                      {slide.id === "ios" ? <HomeIosScannerVisual /> : <HomeChromeExtensionVisual />}
                    </div>
                  </div>
                  <SlideCopy slide={slide} />
                </article>
              ))}
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-[10vh] h-[80vh] flex items-center justify-center">
                <div
                  className="relative w-full max-w-[640px] h-full min-h-[520px]"
                  role="img"
                  aria-label={SLIDES[activeStep]?.visualLabel}
                >
                  {SLIDES.map((slide, index) => (
                    <SlideVisual
                      key={slide.id}
                      slideId={slide.id}
                      active={reduced ? index === SLIDES.length - 1 : activeStep === index}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
