"use client";

import type { ReactNode } from "react";
import { APP_DOWNLOAD_PATH } from "../../lib/app-store";

type Props = {
  className?: string;
  /** Unused — Download always goes through /download until deep links ship. */
  appStoreUrl?: string;
  /** Unused until deep links are live (kept for API stability). */
  path?: string;
  /** Override label (defaults to Download App). */
  label?: string;
  children?: ReactNode;
  testId?: string;
  onAfterClick?: () => void;
};

/**
 * Plain /download hop → App Store. No custom scheme, no apps.apple.com direct
 * link from Universal Link pages (fixes Safari on /khiteri).
 */
export function AppStoreCtaLink({
  className,
  label = "Download App",
  children,
  testId = "link-app-store-cta",
  onAfterClick,
}: Props) {
  return (
    <a
      href={APP_DOWNLOAD_PATH}
      className={className}
      data-testid={testId}
      onClick={() => onAfterClick?.()}
    >
      {children ?? label}
    </a>
  );
}
