"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  DEFAULT_APP_STORE_URL,
  getAppStoreOpenUrl,
  getAppStoreUrl,
  isIosInAppBrowser,
} from "../../lib/app-store";

type Props = {
  className?: string;
  appStoreUrl?: string;
  path?: string;
  label?: string;
  children?: ReactNode;
  testId?: string;
  onAfterClick?: () => void;
};

export function AppStoreCtaLink({
  className,
  appStoreUrl,
  label = "Download App",
  children,
  testId = "link-app-store-cta",
  onAfterClick,
}: Props) {
  const [href, setHref] = useState(getAppStoreUrl(appStoreUrl) || DEFAULT_APP_STORE_URL);

  useEffect(() => {
    setHref(getAppStoreOpenUrl(appStoreUrl));
  }, [appStoreUrl]);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onAfterClick?.();
    if (!isIosInAppBrowser()) return;
    e.preventDefault();
    window.location.href = getAppStoreOpenUrl(appStoreUrl);
  };

  return (
    <a href={href} className={className} data-testid={testId} onClick={handleClick}>
      {children ?? label}
    </a>
  );
}
