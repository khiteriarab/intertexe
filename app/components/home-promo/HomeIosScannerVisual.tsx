"use client";

import Image from "next/image";

/** iOS scanner promo — transparent PNG from Untitled design/1.png (1131×885). */
export function HomeIosScannerVisual() {
  return (
    <div className="relative w-full flex items-center justify-center" data-testid="home-ios-scanner-visual">
      <Image
        src="/promo/home-ios-scanner-transparent.png"
        alt="INTERTEXE iOS app scanning a Massimo Dutti price tag, showing fiber composition and better-material matches"
        width={1131}
        height={885}
        className="w-full h-auto max-w-[680px] mx-auto"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 55vw, 680px"
        priority={false}
      />
    </div>
  );
}
