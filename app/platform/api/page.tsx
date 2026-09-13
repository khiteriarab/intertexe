import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { PlatformDocsClient } from "./PlatformDocsClient";
import "./api-docs.css";

export const metadata: Metadata = {
  title: "Material Intelligence API · Governed Product Intelligence",
  description:
    "GTIN in, governed intelligence out — normalized fibre composition, evidence status, and DPP-readiness via the INTERTEXE Material Intelligence API.",
  alternates: { canonical: "https://www.intertexe.com/platform/api" },
};

export default function PlatformApiPage() {
  return (
    <PlatformChrome active="api">
      <PlatformViewTracker event="platform_api_view" />
      <PlatformDocsClient />
    </PlatformChrome>
  );
}
