"use client";

import type { ReactNode } from "react";
import { DEFAULT_APP_STORE_URL, getAppStoreUrl } from "../../lib/app-store";
import { trackAppDownloadClick } from "../../lib/app-download-click";

type Props = {
  className?: string;
  appStoreUrl?: string;
  /** In-app destination for Universal Link CTAs, e.g. /scanner or /product/123 */
  path?: string;
  label?: string;
  children?: ReactNode;
  testId?: string;
  cta?: string;
  onAfterClick?: () => void;
};

/** Direct App Store listing — never /open or intertexe://. */
export function AppStoreCtaLink({
  className,
  appStoreUrl,
  path: _path,
  label,
  children,
  testId = "link-app-store-cta",
  cta,
  onAfterClick,
}: Props) {
  const ctaName = cta || testId || "app_store_cta";
  const href = getAppStoreUrl(appStoreUrl) || DEFAULT_APP_STORE_URL;
  const resolvedLabel = label || "Download App";
  const goesToOpen = href.includes("/open");

  return (
    <a
      href={href}
      className={className}
      data-testid={testId}
      onClick={() => {
        if (!goesToOpen) {
          trackAppDownloadClick({ ctaLocation: ctaName, destination: "app_store" });
        }
        onAfterClick?.();
      }}
    >
      {children ?? resolvedLabel}
    </a>
  );
}
