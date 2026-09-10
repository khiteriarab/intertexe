"use client";

import Image from "next/image";

/** Real Chrome extension promo — black matte knocked out via mix-blend-screen. */
export function HomeChromeExtensionVisual() {
  return (
    <div className="relative w-full" data-testid="home-chrome-extension-visual">
      <div className="relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-[5/4]">
        <Image
          src="/promo/home-chrome-extension.png"
          alt="INTERTEXE Chrome extension on a Massimo Dutti product page, surfacing better-material jean matches"
          fill
          className="object-contain object-center mix-blend-screen"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
          priority={false}
        />
      </div>
    </div>
  );
}
