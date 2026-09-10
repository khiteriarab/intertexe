"use client";

import Image from "next/image";

/** Chrome extension promo — transparent PNG on ivory section. */
export function HomeChromeExtensionVisual() {
  return (
    <div className="relative w-full" data-testid="home-chrome-extension-visual">
      <div className="relative w-full" style={{ aspectRatio: "1024 / 576" }}>
        <Image
          src="/promo/home-chrome-extension-transparent.png"
          alt="INTERTEXE Chrome extension on a Massimo Dutti product page, surfacing better-material jean matches"
          fill
          className="object-contain object-center"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
          priority={false}
        />
      </div>
    </div>
  );
}
