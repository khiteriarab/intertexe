"use client";

import { ArrowRight } from "lucide-react";
import { getAppStoreUrl } from "../../lib/app-store";
import { getChromeWebStoreUrl } from "../../lib/chrome-extension";
import { AppStoreCtaLink } from "./AppStoreCtaLink";
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
    visualLabel:
      "INTERTEXE iOS app scanning a price tag and surfacing better-material matches",
    href: getAppStoreUrl(),
    ctaLabel: "Download the app",
    testId: "link-home-app-scanner",
    cta: "app_store" as const,
    Visual: HomeIosScannerVisual,
  },
  {
    id: "chrome",
    kicker: "INTERTEXE for Chrome",
    title: "Find better-material matches",
    emphasis: "while you browse",
    description:
      "Shop anywhere on the web. The extension surfaces similar pieces with better fabrics and prices — without leaving the retailer page.",
    visualLabel:
      "INTERTEXE Chrome extension showing better-material matches on a retailer product page",
    href: getChromeWebStoreUrl(),
    ctaLabel: "Add to Chrome",
    testId: "link-home-chrome-extension",
    cta: "external" as const,
    Visual: HomeChromeExtensionVisual,
  },
] as const;

function SlideCopy({ slide }: { slide: (typeof SLIDES)[number] }) {
  const ctaClass =
    "inline-flex items-center gap-2.5 border border-neutral-900 text-neutral-900 px-7 py-3.5 uppercase tracking-[0.2em] text-[10px] font-medium hover:bg-neutral-900 hover:text-white transition-colors duration-300";

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
    <div className="flex flex-col justify-center gap-5 md:gap-6 lg:max-w-[420px] xl:max-w-[460px]">
      <p className="text-[10px] uppercase tracking-[0.38em] text-neutral-400">{slide.kicker}</p>
      <h3 className="text-[34px] md:text-[42px] xl:text-[46px] font-serif leading-[1.06] tracking-[-0.02em] text-neutral-900">
        {slide.title}{" "}
        <em className="not-italic italic text-neutral-700">{slide.emphasis}</em>
      </h3>
      <p className="text-neutral-500 text-[15px] md:text-[16px] leading-[1.65] font-light">{slide.description}</p>
      {cta}
    </div>
  );
}

/** App scanner + Chrome extension — editorial split layout with real product photography. */
export function HomepageProductToolsSection() {
  return (
    <section
      className="border-t border-neutral-200/70 bg-[#faf9f7]"
      data-testid="homepage-product-tools"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 pb-16 md:pb-20 lg:pb-28">
        {SLIDES.map((slide, index) => {
            const { Visual } = slide;
            const flip = slide.id === "chrome";

            return (
              <article
                key={slide.id}
                className={`grid lg:grid-cols-2 gap-10 md:gap-12 lg:gap-16 xl:gap-20 items-center ${
                  index === 0 ? "pt-16 md:pt-20 lg:pt-24 pb-14 md:pb-16 lg:pb-20" : "py-14 md:py-16 lg:py-20 border-t border-neutral-200/80"
                }`}
              >
                <div className={flip ? "lg:col-start-2 lg:row-start-1" : ""}>
                  <SlideCopy slide={slide} />
                </div>

                <div
                  className={`w-full ${flip ? "lg:col-start-1 lg:row-start-1" : ""}`}
                  role="img"
                  aria-label={slide.visualLabel}
                >
                  <Visual />
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}
