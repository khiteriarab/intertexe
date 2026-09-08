import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { DiscoverWorkspace } from "../WorkspaceGallery";
import { PlatformFaq } from "../PlatformFaq";

export const metadata: Metadata = {
  title: "Discover the INTERTEXE workspace",
  description:
    "See what brands buy — the governed data layer, workspace, intelligence, readiness, and outputs — versus INTERTEXE's consumer discovery surface. Illustrative sample workspace.",
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
