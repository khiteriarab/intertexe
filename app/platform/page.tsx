import type { Metadata } from "next";
import { PlatformChrome } from "./PlatformChrome";
import { PlatformHome } from "./PlatformHome";
import { PlatformViewTracker } from "./PlatformViewTracker";

export const metadata: Metadata = {
  title: {
    absolute: "INTERTEXE for Brands | Product & Material Data Layer for Fashion",
  },
  description:
    "INTERTEXE is the product and material data layer for fashion — connect PLM, ERP, spreadsheets and feeds into one governed record, benchmark material strategy, track regulatory readiness, and publish Digital Product Passports and public product experiences.",
};

export default function PlatformPage() {
  return (
    <PlatformChrome active="platform">
      <PlatformViewTracker event="platform_view" />
      <PlatformHome />
    </PlatformChrome>
  );
}
