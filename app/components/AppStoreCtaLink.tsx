"use client";

import type { MouseEvent, ReactNode } from "react";
import { DEFAULT_APP_STORE_URL, getAppStoreUrl } from "../../lib/app-store";

type Props = {
  className?: string;
  appStoreUrl?: string;
  path?: string;
  label?: string;
  children?: ReactNode;
  testId?: string;
  onAfterClick?: () => void;
};

function goToAppStore(url: string, e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  window.location.href = url;
}

/**
 * Download App — opens the App Store directly (hard navigation, https only).
 */
export function AppStoreCtaLink({
  className,
  appStoreUrl,
  label = "Download App",
  children,
  testId = "link-app-store-cta",
  onAfterClick,
}: Props) {
  const href = getAppStoreUrl(appStoreUrl) || DEFAULT_APP_STORE_URL;

  return (
    <a
      href={href}
      className={className}
      data-testid={testId}
      onClick={(e) => {
        onAfterClick?.();
        goToAppStore(href, e);
      }}
    >
      {children ?? label}
    </a>
  );
}
