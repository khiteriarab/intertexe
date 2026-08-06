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
  /** Override auto Open/Download label. */
  label?: string;
  children?: ReactNode;
  testId?: string;
  onAfterClick?: () => void;
};

/**
 * App Store CTA — Download uses a normal https link; Open tries the native scheme.
 */
export function AppStoreCtaLink({
  className,
  appStoreUrl,
  label,
  children,
  testId = "link-app-store-cta",
  onAfterClick,
}: Props) {
  const likelyInstalled = useLikelyAppInstalled();
  const [mounted, setMounted] = useState(false);
  const href = getAppStoreUrl(appStoreUrl);
  const text = label ?? (mounted ? getAppCtaLabel(likelyInstalled) : "Download App");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!likelyInstalled) {
      onAfterClick?.();
      return; // let https App Store href open normally
    }
    e.preventDefault();
    openAppOrStore({ storeUrl: href, preferApp: true });
    onAfterClick?.();
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
    >
      {children ?? text}
    </a>
  );
}
