"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Subtle top bar so navigation feels instant and acknowledged (luxury sites avoid heavy spinners). */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      try {
        const next = new URL(href, window.location.origin);
        if (next.origin !== window.location.origin) return;
        const current = `${pathname}${searchParams?.toString() ? `?${searchParams}` : ""}`;
        const dest = `${next.pathname}${next.search}`;
        if (dest !== current) setActive(true);
      } catch {
        /* ignore */
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, searchParams]);

  if (!active) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] h-[2px] overflow-hidden pointer-events-none"
      aria-hidden
      data-testid="route-progress"
    >
      <div className="h-full w-1/3 bg-foreground/90 route-progress-bar" />
    </div>
  );
}
