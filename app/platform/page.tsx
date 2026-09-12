import type { Metadata } from "next";
import { PlatformChrome } from "./PlatformChrome";
import { PlatformHome } from "./PlatformHome";
import { PlatformViewTracker } from "./PlatformViewTracker";

export const metadata: Metadata = {
  title: {
    absolute: "INTERTEXE for Brands | Product Intelligence Infrastructure for Fashion",
  },
  description:
    "Turn governed product data into the digital experience your customer sees. INTERTEXE connects fashion brands, product data, and consumers — hosted passports, white-label domains, or headless API into your app.",
};

export default function PlatformPage() {
  return (
    <PlatformChrome active="platform">
      <PlatformViewTracker event="platform_view" />
      <PlatformHome />
    </PlatformChrome>
  );
}
