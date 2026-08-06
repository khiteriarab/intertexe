"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import {
  getAppCtaLabel,
  getAppStoreUrl,
  openAppOrStore,
} from "../../lib/app-store";
import { useLikelyAppInstalled } from "../../lib/use-likely-app-installed";

type Props = {
  className?: string;
  appStoreUrl?: string;
  /** Deep-link path (e.g. `/scanner`). Defaults to current page. */
  path?: string;
  /** Override auto Open/Download label. */
  label?: string;
  children?: ReactNode;
  testId?: string;
  onAfterClick?: () => void;
};

/**
 * Permanent Open App CTA — tries the native app for this path, falls back to App Store.
 */
export function AppStoreCtaLink({
  className,
  appStoreUrl,
  path,
  label,
  children,
  testId = "link-app-store-cta",
  onAfterClick,
}: Props) {
  const likelyInstalled = useLikelyAppInstalled();
  const [mounted, setMounted] = useState(false);
  const href = getAppStoreUrl(appStoreUrl);
  const text = label ?? (mounted ? getAppCtaLabel(likelyInstalled) : "Open App");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    openAppOrStore({ storeUrl: href, path });
    onAfterClick?.();
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      rel="noopener noreferrer"
      data-testid={testId}
    >
      {children ?? text}
    </a>
  );
}
