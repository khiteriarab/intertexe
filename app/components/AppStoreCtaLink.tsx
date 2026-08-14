"use client";

import type { ReactNode } from "react";
import { isAppDeepLinkReady } from "../../lib/app-store";
import {
  DEFAULT_APP_STORE_URL,
  getAppStoreOpenUrl,
  getAppStoreUrl,
} from "../../lib/app-store";
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

/** Smart Universal Link when ready; App Store when not. */
export function AppStoreCtaLink({
  className,
  appStoreUrl,
  path,
  label,
  children,
  testId = "link-app-store-cta",
  cta,
  onAfterClick,
}: Props) {
  const ctaName = cta || testId || "app_store_cta";
  const href = isAppDeepLinkReady()
    ? getAppStoreOpenUrl(path, undefined, { cta: ctaName })
    : getAppStoreUrl(appStoreUrl) || DEFAULT_APP_STORE_URL;
  const resolvedLabel = label || (isAppDeepLinkReady() ? "Open App" : "Download App");
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
