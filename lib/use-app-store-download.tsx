"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  DEFAULT_APP_STORE_URL,
  getAppStoreOpenUrl,
  getAppStoreUrl,
  isIosInAppBrowser,
  openAppStore,
} from "./app-store";
import { InAppDownloadHelp } from "../app/components/InAppDownloadHelp";

/**
 * Shared Download App click behavior for Safari + TikTok/Instagram WebViews.
 */
export function useAppStoreDownload(appStoreUrl?: string) {
  const [href, setHref] = useState(getAppStoreUrl(appStoreUrl) || DEFAULT_APP_STORE_URL);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpTimer = useRef<number | null>(null);

  useEffect(() => {
    setHref(getAppStoreOpenUrl(appStoreUrl));
  }, [appStoreUrl]);

  useEffect(() => {
    return () => {
      if (helpTimer.current) window.clearTimeout(helpTimer.current);
    };
  }, []);

  const onDownloadClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (!isIosInAppBrowser()) {
        // Real Safari / Chrome — follow the https App Store href.
        return;
      }

      e.preventDefault();
      openAppStore(appStoreUrl);

      // If TikTok still has us after the escape attempts, show instructions.
      if (helpTimer.current) window.clearTimeout(helpTimer.current);
      helpTimer.current = window.setTimeout(() => {
        if (!document.hidden) setHelpOpen(true);
      }, 1400);
    },
    [appStoreUrl]
  );

  const help = (
    <InAppDownloadHelp
      open={helpOpen}
      onClose={() => setHelpOpen(false)}
      appStoreUrl={appStoreUrl}
    />
  );

  return { href, onDownloadClick, help };
}
