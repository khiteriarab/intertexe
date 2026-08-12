"use client";

import { useEffect, useRef } from "react";
import { trackSearch } from "../../lib/analytics";

/** Fire Meta/GA Search once when results page loads with a real query. */
export function SearchResultsBeacon({
  searchTerm,
  resultCount,
}: {
  searchTerm: string;
  resultCount: number;
}) {
  const fired = useRef(false);
  useEffect(() => {
    const q = searchTerm.trim();
    if (fired.current || q.length < 2) return;
    fired.current = true;
    trackSearch({ searchTerm: q, resultCount });
  }, [searchTerm, resultCount]);
  return null;
}
