"use client";

import type { ReactNode } from "react";
import { useAppStoreDownload } from "../../lib/use-app-store-download";

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
  const { href, onDownloadClick, help } = useAppStoreDownload(appStoreUrl);

  return (
    <>
      <a
        href={href}
        className={className}
        data-testid={testId}
        onClick={(e) => {
          onAfterClick?.();
          onDownloadClick(e);
        }}
      >
        {children ?? label}
      </a>
      {help}
    </>
  );
}
