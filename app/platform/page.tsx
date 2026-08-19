import type { Metadata } from "next";
import { PlatformChrome } from "./PlatformChrome";
import { PlatformHome } from "./PlatformHome";
import { PlatformViewTracker } from "./PlatformViewTracker";

export const metadata: Metadata = {
  title: "Digital Product Passports for fashion",
  description:
    "INTERTEXE transforms fragmented fashion product data into structured material intelligence, generates Digital Product Passports and product identities, and helps brands keep their catalog current as requirements evolve.",
};

export default function PlatformPage() {
  return (
    <PlatformChrome active="platform">
      <PlatformViewTracker event="platform_view" />
      <PlatformHome />
    </PlatformChrome>
  );
}
