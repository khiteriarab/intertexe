"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAppStoreUrl } from "../../lib/app-store";
import { getChromeWebStoreUrl } from "../../lib/chrome-extension";
import { AppStoreCtaLink } from "./AppStoreCtaLink";

const APP_PROMO_IMAGE = "/promo/home-ios-scanner.png";
const CHROME_PROMO_IMAGE = "/promo/home-chrome-extension.png";

function ToolCard({
  kicker,
  title,
  description,
  imageSrc,
  imageAlt,
  href,
  ctaLabel,
  testId,
  external,
  cta,
}: {
  kicker: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  ctaLabel: string;
  testId: string;
  external?: boolean;
  cta?: string;
}) {
  const image = (
    <div className="overflow-hidden bg-[#f3f1ed] border border-neutral-200/80">
      <img
        src={imageSrc}
        alt={imageAlt}
        className="w-full h-auto object-cover"
        loading="lazy"
      />
    </div>
  );

  const ctaButton =
    cta === "app_store" ? (
      <AppStoreCtaLink
        appStoreUrl={href}
        cta={testId}
        className="inline-flex items-center gap-2 border border-neutral-800 text-neutral-800 px-6 py-3 uppercase tracking-[0.18em] text-[10px] md:text-[11px] font-light hover:bg-neutral-800 hover:text-white transition-all duration-300 active:scale-[0.97]"
        testId={testId}
      >
        {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
      </AppStoreCtaLink>
    ) : (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="inline-flex items-center gap-2 border border-neutral-800 text-neutral-800 px-6 py-3 uppercase tracking-[0.18em] text-[10px] md:text-[11px] font-light hover:bg-neutral-800 hover:text-white transition-all duration-300 active:scale-[0.97]"
        data-testid={testId}
      >
        {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
      </a>
    );

  return (
    <article className="flex flex-col gap-5 md:gap-6">
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 focus-visible:ring-offset-2"
          data-testid={`${testId}-image`}
        >
          {image}
        </a>
      ) : (
        <Link
          href={href}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 focus-visible:ring-offset-2"
          data-testid={`${testId}-image`}
        >
          {image}
        </Link>
      )}
      <div className="flex flex-col gap-3 px-1">
        <p className="text-[9px] md:text-[10px] uppercase tracking-[0.35em] text-neutral-400">
          {kicker}
        </p>
        <h3 className="text-[22px] md:text-[28px] font-serif leading-[1.15]">{title}</h3>
        <p className="text-neutral-500 text-[13px] md:text-[15px] leading-relaxed font-light max-w-md">
          {description}
        </p>
        {ctaButton}
      </div>
    </article>
  );
}

/** App scanner + Chrome extension — homepage bottom funnel before the quiz. */
export function HomepageProductToolsSection() {
  const appHref = getAppStoreUrl();
  const chromeHref = getChromeWebStoreUrl();

  return (
    <section
      className="border-t border-neutral-200/60 py-16 md:py-24 px-4 md:px-8"
      data-testid="homepage-product-tools"
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-10 md:gap-14">
        <div className="flex flex-col gap-4 md:gap-5 text-center md:text-left max-w-2xl">
          <p className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-neutral-400">
            Our moat
          </p>
          <h2 className="text-[28px] md:text-[44px] font-serif leading-[1.1]">
            Scan fabrics in stores. Shop smarter online.
          </h2>
          <p className="text-neutral-500 text-[13px] md:text-[16px] leading-relaxed font-light">
            The INTERTEXE fabric scanner reads care labels and barcodes in seconds — then finds
            better-material matches at similar prices, in the app or on Chrome.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-10 lg:gap-12">
          <ToolCard
            kicker="INTERTEXE for iOS"
            title="Use the fabric scanner in stores"
            description="Point your camera at any care label or barcode. Get fiber composition instantly and discover verified natural-fiber alternatives while you shop."
            imageSrc={APP_PROMO_IMAGE}
            imageAlt="INTERTEXE iOS app scanning a garment care label in a store"
            href={appHref}
            ctaLabel="Download the app"
            testId="link-home-app-scanner"
            cta="app_store"
          />
          <ToolCard
            kicker="INTERTEXE for Chrome"
            title="Find better-material matches while you browse"
            description="Shop anywhere on the web. The extension surfaces similar pieces with better fabrics and prices — without leaving the retailer page."
            imageSrc={CHROME_PROMO_IMAGE}
            imageAlt="INTERTEXE Chrome extension showing better-material matches on a retailer product page"
            href={chromeHref}
            ctaLabel="Add to Chrome"
            testId="link-home-chrome-extension"
            external
          />
        </div>
      </div>
    </section>
  );
}
