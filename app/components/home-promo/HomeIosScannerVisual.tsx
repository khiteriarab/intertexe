"use client";

import Image from "next/image";

/** Real iOS scanner promo — black matte knocked out via mix-blend-screen. */
export function HomeIosScannerVisual() {
  return (
    <div className="relative w-full" data-testid="home-ios-scanner-visual">
      <div className="relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-[5/4]">
        <Image
          src="/promo/home-ios-scanner.png"
          alt="INTERTEXE iOS app scanning a Massimo Dutti price tag, showing fiber composition and better-material matches"
          fill
          className="object-contain object-center mix-blend-screen"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
          priority={false}
        />
      </div>
    </div>
  );
}
