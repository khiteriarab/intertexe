import type { Metadata } from "next";
import { PlatformChrome } from "./PlatformChrome";
import { PlatformHome } from "./PlatformHome";
import { PlatformViewTracker } from "./PlatformViewTracker";

export const metadata: Metadata = {
  title: "INTERTEXE for Brands | Product & Material Intelligence for Fashion",
  description:
    "INTERTEXE connects and normalizes fashion product data, benchmarks material strategy, resolves data-quality issues, and prepares governed records for Digital Product Passports. Product and material intelligence for brands — from fragmented inputs to approved outputs.",
};

export default function PlatformPage() {
  return (
    <PlatformChrome active="platform">
      <PlatformViewTracker event="platform_view" />
      <PlatformHome />
    </PlatformChrome>
  );
}
