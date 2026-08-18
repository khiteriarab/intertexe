"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { GA_MEASUREMENT_ID } from "../../lib/analytics";

/**
 * SPA page views after the first load. The official gtag snippet lives in
 * app/layout.tsx <head> so Google can verify the store from static HTML.
 */
export function Analytics() {
  const pathname = usePathname();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      send_to: GA_MEASUREMENT_ID,
    });
  }, [pathname]);

  return null;
}
