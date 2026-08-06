"use client";

import type { ReactNode } from "react";
import { useAppStoreHref } from "../../lib/use-app-store-href";

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
 * App Store CTA — uses x-safari-https:// inside iOS in-app browsers
 * so Instagram/TikTok can hand off to Safari → App Store.
 */
export function AppStoreCtaLink({
  className,
  appStoreUrl,
  label = "Download App",
  children,
  testId = "link-app-store-cta",
  onAfterClick,
}: Props) {
  const href = useAppStoreHref(appStoreUrl);

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
