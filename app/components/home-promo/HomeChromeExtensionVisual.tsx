"use client";

import Image from "next/image";

/** Chrome extension promo — transparent PNG from Untitled design/2.png (1438×857). */
export function HomeChromeExtensionVisual() {
  return (
    <div className="relative w-full flex items-center justify-center" data-testid="home-chrome-extension-visual">
      <Image
        src="/promo/home-chrome-extension-transparent.png"
        alt="INTERTEXE Chrome extension on a Massimo Dutti product page, surfacing better-material jean matches"
        width={1438}
        height={857}
        className="w-full h-auto max-w-[680px] mx-auto"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 55vw, 680px"
        priority={false}
      />
    </div>
  );
}
