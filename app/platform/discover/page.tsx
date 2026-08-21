import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { DiscoverWorkspace } from "../WorkspaceGallery";

export const metadata: Metadata = {
  title: "Discover the INTERTEXE workspace",
  description:
    "One workspace for material intelligence: overview, issues, benchmarking, passport studio and regulatory monitor. Illustrative sample — not a live customer catalog.",
};

export default function PlatformDiscoverPage() {
  return (
    <PlatformChrome active="discover">
      <PlatformViewTracker event="platform_discover_view" />
      <DiscoverWorkspace />
    </PlatformChrome>
  );
}
