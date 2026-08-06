"use client";

import { useEffect, useState } from "react";
import { readLikelyAppInstalled } from "./app-store";

/**
 * True when we’ve previously seen the custom scheme open the native app.
 * CTA still defaults to “Open App”; this mainly keeps the label accurate after a successful open.
 */
export function useLikelyAppInstalled(): boolean {
  const [likely, setLikely] = useState(false);

  useEffect(() => {
    setLikely(readLikelyAppInstalled());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "intertexe-app-likely-installed") {
        setLikely(readLikelyAppInstalled());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return likely;
}
