/**
 * Shop result-count display. Never show 0 when cards are on screen,
 * and never keep the unfiltered 300k total after a filter is applied.
 */
export function shopDisplayedCount(opts: {
  resultTotal: number | null;
  productsOnPage: number;
  filtersActive: boolean;
  unfilteredKnownTotal?: number;
}): number | null {
  const visible = Math.max(0, opts.productsOnPage);
  if (opts.resultTotal != null && opts.resultTotal > 0) {
    return Math.max(opts.resultTotal, visible);
  }
  if (visible > 0) return visible;
  if (opts.resultTotal === 0) return 0;
  if (!opts.filtersActive && (opts.unfilteredKnownTotal ?? 0) > 0) {
    return opts.unfilteredKnownTotal ?? null;
  }
  return null;
}
