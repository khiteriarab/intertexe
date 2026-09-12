import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { DiscoverWorkspace } from "../WorkspaceGallery";
import { PlatformFaq } from "../PlatformFaq";

export const metadata: Metadata = {
  title: "Discover the INTERTEXE workspace",
  description:
    "See how INTERTEXE governs product data and delivers consumer experiences — hosted passport, white-label domain, or headless API into your app. Illustrative sample workspace.",
};

export default function PlatformDiscoverPage() {
  return (
    <PlatformChrome active="discover">
      <PlatformViewTracker event="platform_discover_view" />
      <DiscoverWorkspace />
      <PlatformFaq />
    </PlatformChrome>
  );
}
