import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformDemoClient } from "./PlatformDemoClient";

export const metadata: Metadata = {
  title: "Material Intelligence API demo",
  description:
    "Send a GTIN, EAN or SKU. Receive normalized fibre composition, evidence provenance and a DPP-readiness map. Demonstration data only.",
  alternates: { canonical: "https://www.intertexe.com/platform/demo" },
};

export default function PlatformDemoPage() {
  return (
    <PlatformChrome active="demo">
      <PlatformDemoClient />
    </PlatformChrome>
  );
}
