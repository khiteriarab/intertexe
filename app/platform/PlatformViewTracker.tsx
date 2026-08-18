"use client";

import { useEffect } from "react";
import { trackPlatform } from "../../lib/platform-analytics";

export function PlatformViewTracker({ event }: { event: string }) {
  useEffect(() => {
    trackPlatform(event);
  }, [event]);
  return null;
}
