"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DEFAULT_APP_STORE_URL, getAppStoreUrl } from "../../lib/app-store";

type Props = {
  className?: string;
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
 * Plain App Store link — no custom-scheme probe (Safari “Action can't be completed”).
 */
export function AppStoreCtaLink({
  className,
  appStoreUrl,
  label = "Download App",
  children,
  testId = "link-app-store-cta",
  onAfterClick,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const href = getAppStoreUrl(appStoreUrl) || DEFAULT_APP_STORE_URL;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <a
      href={href}
      target="_self"
      className={className}
      data-testid={testId}
      onClick={() => onAfterClick?.()}
    >
      {children ?? (mounted ? label : "Download App")}
    </a>
  );
}
