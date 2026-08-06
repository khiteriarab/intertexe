"use client";

import type { ReactNode } from "react";
import { APP_DOWNLOAD_PATH } from "../../lib/app-store";

type Props = {
  className?: string;
  appStoreUrl?: string;
  path?: string;
  label?: string;
  children?: ReactNode;
  testId?: string;
  onAfterClick?: () => void;
};

/** Same-origin /download only — no App Store URL in the markup. */
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
