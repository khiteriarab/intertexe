"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  HOMEPAGE_HERO_IMAGE_DESKTOP,
  HOMEPAGE_HERO_IMAGE_MOBILE,
} from "../../lib/editorial-assets";

/** Portrait grotto campaign — v8; desktop object-position in globals.css (face + full figure). */
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
        className="relative w-full lg:hidden overflow-hidden"
        data-testid="homepage-hero-mobile"
      >
        <div className="homepage-hero-frame-mobile">
          <Image
            src={HOMEPAGE_HERO_IMAGE_MOBILE}
            alt=""
            fill
            priority
            quality={100}
            sizes="100vw"
            aria-hidden
            className="homepage-hero-img homepage-hero-img--mobile"
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent pointer-events-none" />
        <div
          className="absolute inset-0 z-10 flex flex-col justify-end px-6 pb-16 max-w-xl"
          style={{ paddingBottom: "max(4rem, calc(env(safe-area-inset-bottom, 0px) + 3.5rem))" }}
        >
          <h2 className="text-[34px] leading-[1.06] font-serif text-white mb-4" data-testid="text-hero-headline">
            Know what you are wearing.
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
        className="homepage-hero relative w-full hidden lg:block overflow-hidden"
        data-testid="homepage-hero-desktop"
      >
        <div className="homepage-hero-desktop-frame">
          <Image
            src={HOMEPAGE_HERO_IMAGE_DESKTOP}
            alt="INTERTEXE editorial"
            fill
            priority
            quality={100}
            sizes="100vw"
            className="homepage-hero-img homepage-hero-img--desktop"
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-10 flex flex-col justify-end px-14 xl:px-20 pb-14 xl:pb-16 max-w-2xl">
          <h2
            className="text-[48px] xl:text-[56px] font-serif leading-[1.05] text-white mb-5"
            data-testid="text-hero-headline-desktop"
          >
            Know what you are wearing.
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
