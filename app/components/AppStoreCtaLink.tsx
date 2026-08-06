"use client";

import type { ReactNode } from "react";
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

/**
 * Plain App Store link — no preventDefault / location.href
 * (those trigger Safari “Action can't be completed” even when the store opens).
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
      onClick={() => onAfterClick?.()}
    >
      {children ?? label}
    </a>
  );
}
