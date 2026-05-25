"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOMEPAGE_HERO_IMAGE } from "../../lib/editorial-assets";

/** Portrait campaign hero — full viewport width; product grid stays in rails below (not beside hero). */
export function HomepageHeroSection({
  productCountLabel,
  brandCountLabel,
}: {
  productCountLabel: string;
  brandCountLabel: string;
  products?: unknown[];
}) {
  return (
    <>
      <section
        className="relative w-full -mx-4 md:-mx-8 lg:hidden overflow-hidden"
        data-testid="homepage-hero-mobile"
      >
        <div className="homepage-hero-frame-mobile relative w-full overflow-hidden bg-[#eae8e4]">
          <img
            src={HOMEPAGE_HERO_IMAGE}
            alt="INTERTEXE — Luxury natural-fiber fashion"
            className="absolute inset-0 w-full h-full object-cover object-[center_38%]"
            fetchPriority="high"
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent pointer-events-none" />
        <div
          className="absolute inset-0 z-10 flex flex-col justify-end px-6 pb-16 max-w-xl"
          style={{ paddingBottom: "max(4rem, calc(env(safe-area-inset-bottom, 0px) + 3.5rem))" }}
        >
          <h2 className="text-[34px] leading-[1.06] font-serif text-white mb-4" data-testid="text-hero-headline">
            No polyester.<br />
            Ever.
          </h2>
          <p className="text-[12px] text-white/70 mb-8 font-light leading-relaxed max-w-sm" data-testid="text-hero-subtext">
            {productCountLabel} verified natural fiber pieces across {brandCountLabel} brands. Every composition checked.
          </p>
          <Link
            href="/shop"
            className="bg-white text-black px-10 py-3.5 uppercase tracking-[0.2em] text-[10px] font-medium hover:bg-white/90 transition-all w-fit flex items-center gap-2.5"
            data-testid="button-shop-now"
          >
            Shop now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      <section
        className="relative w-full -mx-4 md:-mx-8 hidden lg:block overflow-hidden border-b border-neutral-200/60"
        data-testid="homepage-hero-desktop"
      >
        <div className="homepage-hero-desktop-frame">
          <img
            src={HOMEPAGE_HERO_IMAGE}
            alt="INTERTEXE editorial"
            className="absolute inset-0 w-full h-full object-cover object-[center_22%]"
            fetchPriority="high"
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-10 flex flex-col justify-end px-14 xl:px-20 pb-14 xl:pb-16 max-w-2xl">
          <h2
            className="text-[48px] xl:text-[56px] font-serif leading-[1.05] text-white mb-5"
            data-testid="text-hero-headline-desktop"
          >
            No polyester. Ever.
          </h2>
          <p
            className="text-[15px] text-white/75 font-light leading-relaxed max-w-lg mb-10"
            data-testid="text-hero-subtext-desktop"
          >
            {productCountLabel} verified natural fiber pieces across {brandCountLabel} brands. Every composition checked.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2.5 bg-white text-black px-10 py-3.5 uppercase tracking-[0.2em] text-[10px] font-medium hover:bg-white/90 transition-colors w-fit"
            data-testid="button-shop-now-desktop"
          >
            Shop now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
