"use client";

import { SlidersHorizontal } from "lucide-react";
import type { CatalogActiveFilter } from "./CatalogMobileToolbar";

/** Desktop catalog bar: count + Filter (left), Sort label only (right). */
export function CatalogDesktopBar({
  resultCount,
  countLoading,
  sortLabel,
  onOpenFilter,
  onOpenSort,
  activeFilters = [],
  showFilter = true,
  className = "",
}: {
  resultCount: number | null;
  countLoading?: boolean;
  sortLabel: string;
  onOpenFilter?: () => void;
  onOpenSort: () => void;
  activeFilters?: CatalogActiveFilter[];
  showFilter?: boolean;
  className?: string;
}) {
  const countText =
    countLoading || resultCount == null ? (
      <span className="animate-pulse text-foreground/30">—</span>
    ) : (
      <span className="tabular-nums text-foreground/80">{resultCount.toLocaleString()}</span>
    );

  return (
    <div
      className={`hidden md:flex items-center justify-between pb-5 border-b border-foreground/[0.06] mb-8 gap-6 ${className}`}
      data-testid="catalog-desktop-bar"
    >
      <div className="flex items-center gap-5 min-w-0 flex-wrap">
        <span className="text-[11px] tracking-[0.15em] text-foreground/35 uppercase shrink-0">
          {countText} pieces
        </span>
        {showFilter && onOpenFilter && (
          <button
            type="button"
            onClick={onOpenFilter}
            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-foreground hover:text-foreground/70 transition-colors shrink-0"
            data-testid="btn-desktop-filter"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.25]" />
            Filter
          </button>
        )}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={f.onRemove}
                className="text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 border border-foreground/20 text-foreground/70 hover:text-foreground"
              >
                {f.label} ×
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenSort}
        className="text-[11px] uppercase tracking-[0.14em] text-foreground/50 hover:text-foreground transition-colors shrink-0"
        data-testid="btn-desktop-sort"
      >
        Sort: <span className="text-foreground">{sortLabel}</span>
      </button>
    </div>
  );
}
