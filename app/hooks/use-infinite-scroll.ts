"use client";

import { useEffect, useRef } from "react";

/** Net-a-Porter-style prefetch — fires when sentinel nears the viewport. */
export function useInfiniteScroll(
  enabled: boolean,
  onLoadMore: () => void,
  deps: unknown[] = []
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (loadingRef.current) return;
        loadingRef.current = true;
        onLoadMore();
        queueMicrotask(() => {
          loadingRef.current = false;
        });
      },
      { rootMargin: "400px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, onLoadMore, ...deps]);

  return sentinelRef;
}
