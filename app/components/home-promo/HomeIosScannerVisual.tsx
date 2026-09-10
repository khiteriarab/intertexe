"use client";

import Image from "next/image";

/** Real iOS scanner promo — edge-matted PNG on ivory section. */
export function HomeIosScannerVisual() {
  return (
    <div className="relative w-full" data-testid="home-ios-scanner-visual">
      <div className="relative w-full" style={{ aspectRatio: "1024 / 935" }}>
        <Image
          src="/promo/home-ios-scanner-transparent.png"
          alt="INTERTEXE iOS app scanning a Massimo Dutti price tag, showing fiber composition and better-material matches"
          fill
          className="object-contain object-center"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
          priority={false}
        />
      </div>
    </div>
  );
}
