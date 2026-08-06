"use client";

import { useEffect, useState } from "react";
import { DEFAULT_APP_STORE_URL, getAppStoreOpenUrl } from "./app-store";

/** Client-resolved App Store href (x-safari-https:// inside Instagram/TikTok/etc). */
export function useAppStoreHref(explicit?: string): string {
  const [href, setHref] = useState(DEFAULT_APP_STORE_URL);

  useEffect(() => {
    setHref(getAppStoreOpenUrl(explicit));
  }, [explicit]);

  return href;
}
