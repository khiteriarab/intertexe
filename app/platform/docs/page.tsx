import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { PlatformDocsClient } from "./PlatformDocsClient";

export const metadata: Metadata = {
  title: "Material Intelligence API · Product Data Layer",
  description:
    "Authentication, GTIN validation, evidence statuses, and DPP-readiness for the INTERTEXE product and material data layer API.",
};

export default function PlatformDocsPage() {
  return (
    <PlatformChrome active="docs">
      <PlatformViewTracker event="platform_docs_view" />
      <PlatformDocsClient />
    </PlatformChrome>
  );
}
