"use client";

import Image from "next/image";

/** Real iOS scanner promo — product photography from the app flow. */
export function HomeIosScannerVisual() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[1.25rem] md:rounded-[1.5rem] bg-[#0c0c0c] shadow-[0_40px_100px_-24px_rgba(0,0,0,0.45)] ring-1 ring-black/10"
      data-testid="home-ios-scanner-visual"
    >
      <div className="relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-[5/4]">
        <Image
          src="/promo/home-ios-scanner.png"
          alt="INTERTEXE iOS app scanning a Massimo Dutti price tag, showing fiber composition and better-material matches"
          fill
          className="object-contain object-center p-3 sm:p-4 md:p-5"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
          priority={false}
        />
      </div>
    </div>
  );
}
