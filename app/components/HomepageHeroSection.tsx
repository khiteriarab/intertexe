"use client";

import Image from "next/image";
import Link from "next/link";
import {
  HOMEPAGE_HERO_IMAGE_DESKTOP,
  HOMEPAGE_HERO_IMAGE_MOBILE,
} from "../../lib/editorial-assets";

/** Campaign hero — editorial but breathable (NAP / Mytheresa scale). */
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
        className="relative w-full lg:hidden overflow-hidden bg-neutral-900"
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
            style={{ objectPosition: "center 72%" }}
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
        <div
          className="absolute inset-0 z-10 flex flex-col justify-end px-6 pb-12 max-w-xl"
          style={{ paddingBottom: "max(3rem, calc(env(safe-area-inset-bottom, 0px) + 2.5rem))" }}
        >
          <h2
            className="font-serif text-[32px] font-light leading-[1.08] text-white mb-6"
            data-testid="text-hero-headline"
          >
            Know what you are wearing.
          </h2>
          <Link
            href="/shop"
            className="inline-flex w-fit items-center justify-center border border-white px-8 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-neutral-900"
            data-testid="button-shop-now"
          >
            Shop now
          </Link>
        </div>
      </section>

      <section
        className="homepage-hero relative w-full hidden lg:block overflow-hidden bg-neutral-900"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-10 flex flex-col justify-end px-14 xl:px-20 pb-12 max-w-xl">
          <h2
            className="font-serif text-[40px] xl:text-[44px] font-light leading-[1.06] text-white mb-8"
            data-testid="text-hero-headline-desktop"
          >
            Know what you are wearing.
          </h2>
          <Link
            href="/shop"
            className="inline-flex w-fit items-center justify-center border border-white px-10 py-3.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-neutral-900"
            data-testid="button-shop-now-desktop"
          >
            Shop now
          </Link>
        </div>
      </section>
    </>
  );
}
