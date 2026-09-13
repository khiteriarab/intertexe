import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { PlatformDocsClient } from "./PlatformDocsClient";

export const metadata: Metadata = {
  title: "Material Intelligence API · Product Data Layer",
  description:
    "Authentication, GTIN validation, evidence statuses, and DPP-readiness for the INTERTEXE product and material data layer API.",
};

export default function PlatformApiPage() {
  return (
    <PlatformChrome active="api">
      <PlatformViewTracker event="platform_api_view" />
      <PlatformDocsClient />
    </PlatformChrome>
  );
}
