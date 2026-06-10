"use client";

import { SlidersHorizontal, X } from "lucide-react";

export type CatalogActiveFilter = {
  id: string;
  label: string;
  onRemove: () => void;
};

/** Filled chips for applied filters only (not “All” / default). */
export function CatalogActiveFilterChips({
  filters,
  className = "",
}: {
  filters: CatalogActiveFilter[];
  className?: string;
}) {
  if (filters.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {filters.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={f.onRemove}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] uppercase tracking-[0.12em] border border-foreground bg-foreground text-background"
        >
          {f.label}
          <X className="w-3 h-3 opacity-80" />
        </button>
      ))}
    </div>
  );
}

/** NET-A-PORTER-style mobile bar: Filter (left), Sort (right), active filter chips. */
export function CatalogMobileToolbar({
  resultCount,
  countLoading,
  sortLabel,
  onOpenFilter,
  onOpenSort,
  activeFilters = [],
  className = "",
  showFilter = true,
}: {
  resultCount: number | null;
  countLoading?: boolean;
  sortLabel: string;
  onOpenFilter: () => void;
  onOpenSort: () => void;
  activeFilters?: CatalogActiveFilter[];
  className?: string;
  showFilter?: boolean;
}) {
  const countText =
    countLoading || resultCount == null ? (
      <span className="animate-pulse text-muted-foreground">—</span>
    ) : (
      <span className="text-foreground tabular-nums">{resultCount.toLocaleString()}</span>
    );

  return (
    <div className={`flex flex-col gap-3 lg:hidden ${className}`}>
      <div className="flex items-center justify-between border-y border-border/25 py-3">
        {showFilter ? (
          <button
            type="button"
            onClick={onOpenFilter}
            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-foreground"
            data-testid="btn-mobile-filter"
          >
            <SlidersHorizontal className="w-4 h-4 stroke-[1.25]" />
            Filter
          </button>
        ) : (
          <span className="w-[52px]" />
        )}
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground" data-testid="text-result-count-mobile">
          {countText} results
        </p>
        <button
          type="button"
          onClick={onOpenSort}
          className="text-[11px] uppercase tracking-[0.14em] text-foreground"
          data-testid="btn-mobile-sort"
        >
          Sort: <span className="text-muted-foreground">{sortLabel}</span>
        </button>
      </div>

      <CatalogActiveFilterChips filters={activeFilters} className="-mt-1" />
    </div>
  );
}

/** Bottom sheet shell for filter or sort panels. */
export function CatalogMobileSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      {/* Above MobileBottomDock (z-[100]) so Apply/View results is never hidden behind nav */}
      <div className="fixed inset-0 z-[200] bg-black/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-[210] bg-background border-t border-border/40 rounded-t-2xl max-h-[88vh] flex flex-col md:hidden">
        <div className="px-6 pt-5 pb-3 border-b border-border/20 shrink-0">
          <p className="text-lg font-serif">{title}</p>
          {subtitle && (
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="overflow-y-auto px-6 py-5 flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] border-t border-border/20 shrink-0 bg-background">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
