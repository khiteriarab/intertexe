import type { Metadata } from "next";
import { DownloadClientRedirect } from "./DownloadClientRedirect";

export const metadata: Metadata = {
  title: "Download INTERTEXE",
  robots: { index: false, follow: false },
};

/**
 * Hop page for TikTok/Instagram → Safari → App Store.
 * Client replace is more reliable than a server redirect alone in some WebViews.
 */
export default function DownloadAppPage() {
  return <DownloadClientRedirect />;
}
