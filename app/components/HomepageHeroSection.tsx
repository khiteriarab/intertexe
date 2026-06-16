"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  HOMEPAGE_HERO_IMAGE_DESKTOP,
  HOMEPAGE_HERO_IMAGE_MOBILE,
} from "../../lib/editorial-assets";

/** Portrait campaign hero — first editorial moment after nav. */
export function HomepageHeroSection({
  productCountLabel: _productCountLabel,
  brandCountLabel: _brandCountLabel,
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
            alt="INTERTEXE — Luxury natural-fiber fashion"
            fill
            priority
            quality={100}
            sizes="100vw"
            className="homepage-hero-img"
            style={{ objectPosition: "center 75%" }}
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent pointer-events-none" />
        <div
          className="absolute inset-0 z-10 flex flex-col justify-end px-6 pb-16 max-w-xl"
          style={{ paddingBottom: "max(4rem, calc(env(safe-area-inset-bottom, 0px) + 3.5rem))" }}
        >
          <h2 className="text-display text-white mb-8" data-testid="text-hero-headline">
            Know what you are wearing.
          </h2>
          <Link
            href="/shop"
            className="bg-white text-black px-10 py-3.5 uppercase tracking-[0.2em] text-label font-medium hover:bg-white/90 transition-all w-fit flex items-center gap-2.5"
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
            className="homepage-hero-img"
            style={{ objectPosition: "center 58%" }}
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-10 flex flex-col justify-end px-14 xl:px-20 pb-14 xl:pb-16 max-w-2xl">
          <h2
            className="text-display text-white mb-10"
            data-testid="text-hero-headline-desktop"
          >
            Know what you are wearing.
          </h2>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2.5 bg-white text-black px-10 py-3.5 uppercase tracking-[0.2em] text-label font-medium hover:bg-white/90 transition-colors w-fit"
            data-testid="button-shop-now-desktop"
          >
            Shop now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
