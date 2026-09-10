"use client";

import Image from "next/image";

/** iOS scanner promo — transparent PNG on ivory section. */
export function HomeIosScannerVisual() {
  return (
    <div className="relative w-full lg:min-h-[420px] flex items-center" data-testid="home-ios-scanner-visual">
      <div className="relative w-full" style={{ aspectRatio: "577 / 460" }}>
        <Image
          src="/promo/home-ios-scanner-transparent.png"
          alt="INTERTEXE iOS app scanning a Massimo Dutti price tag, showing fiber composition and better-material matches"
          fill
          className="object-contain object-center"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 55vw, 680px"
          priority={false}
        />
      </div>
    </div>
  );
}
