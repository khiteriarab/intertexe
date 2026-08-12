"use client";

import type { ReactNode } from "react";
import {
  DEFAULT_APP_STORE_URL,
  getAppStoreOpenUrl,
  getAppStoreUrl,
  isAppDeepLinkReady,
} from "../../lib/app-store";

type Props = {
  className?: string;
  appStoreUrl?: string;
  /** In-app destination for Universal Link CTAs, e.g. /scanner or /product/123 */
  path?: string;
  label?: string;
  children?: ReactNode;
  testId?: string;
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
  onAfterClick,
}: Props) {
  const href = isAppDeepLinkReady()
    ? getAppStoreOpenUrl(path)
    : getAppStoreUrl(appStoreUrl) || DEFAULT_APP_STORE_URL;
  const resolvedLabel = label || (isAppDeepLinkReady() ? "Open App" : "Download App");

  return (
    <a
      href={href}
      className={className}
      data-testid={testId}
      onClick={() => onAfterClick?.()}
    >
      {children ?? resolvedLabel}
    </a>
  );
}
