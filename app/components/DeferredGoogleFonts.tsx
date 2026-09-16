"use client";

import { useEffect } from "react";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap";

/** Inject Google Fonts after first paint so a slow/blocked stylesheet cannot hang the tab. */
export function DeferredGoogleFonts() {
  useEffect(() => {
    if (document.querySelector(`link[data-intertexe-fonts="1"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    link.dataset.intertexeFonts = "1";
    document.head.appendChild(link);
  }, []);
  return null;
}
