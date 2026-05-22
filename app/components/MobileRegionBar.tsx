"use client";

import { CountrySelector } from "./CountrySelector";

/** Slim shipping destination control above mobile bottom nav (Net-a-Porter style). */
export function MobileRegionBar({ detectedCountryCode }: { detectedCountryCode?: string }) {
  return (
    <div
      className="md:hidden fixed left-0 right-0 z-[49] border-t border-border/30 bg-background/98 backdrop-blur-sm px-4 py-2 flex items-center justify-center"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
      data-testid="mobile-region-bar"
    >
      <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground mr-3">
        Shipping to
      </span>
      <CountrySelector detectedCountryCode={detectedCountryCode} compact />
    </div>
  );
}
