"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

export type FilterOption<T extends string> = { key: T; label: string };

type SectionProps<T extends string> = {
  title: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (key: T) => void;
  open: boolean;
  onToggle: () => void;
};

function FilterSection<T extends string>({
  title,
  options,
  value,
  onChange,
  open,
  onToggle,
}: SectionProps<T>) {
  const current = options.find((o) => o.key === value)?.label ?? "All";

  return (
    <div className="border-b border-border/25">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left group"
        aria-expanded={open}
      >
        <span className="text-[11px] uppercase tracking-[0.18em] font-medium text-foreground">
          {title}
        </span>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="tracking-wide">{current}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open && (
        <ul className="pb-4 space-y-0.5">
          {options.map((opt) => (
            <li key={opt.key}>
              <button
                type="button"
                onClick={() => onChange(opt.key)}
                className={`w-full text-left py-2 text-[12px] transition-colors ${
                  value === opt.key
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type CatalogFilterSidebarProps<TFiber extends string, TCategory extends string> = {
  resultCount: number | null;
  isLoading?: boolean;
  fiberTab: TFiber;
  categoryFilter: TCategory;
  fiberOptions: FilterOption<TFiber>[];
  categoryOptions: FilterOption<TCategory>[];
  onFiberChange: (key: TFiber) => void;
  onCategoryChange: (key: TCategory) => void;
  className?: string;
};

export function CatalogFilterSidebar<TFiber extends string, TCategory extends string>({
  resultCount,
  isLoading,
  fiberTab,
  categoryFilter,
  fiberOptions,
  categoryOptions,
  onFiberChange,
  onCategoryChange,
  className = "",
}: CatalogFilterSidebarProps<TFiber, TCategory>) {
  const [openSection, setOpenSection] = useState<"category" | "material" | null>("category");

  const toggle = (section: "category" | "material") => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  return (
    <aside
      className={`hidden lg:block w-[260px] shrink-0 pr-6 ${className}`}
      data-testid="catalog-filter-sidebar"
    >
      <div className="flex items-center gap-2 mb-1 pt-1">
        <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-[11px] uppercase tracking-[0.2em] font-medium">Filter</span>
      </div>
      <p className="text-[12px] text-muted-foreground mb-6" data-testid="sidebar-result-count">
        {isLoading || resultCount == null ? (
          <span className="animate-pulse">Loading…</span>
        ) : (
          <>
            <span className="text-foreground font-medium">
              {resultCount.toLocaleString()}
            </span>{" "}
            Results
          </>
        )}
      </p>

      <FilterSection
        title="Category"
        options={categoryOptions}
        value={categoryFilter}
        onChange={(key) => {
          onCategoryChange(key);
        }}
        open={openSection === "category"}
        onToggle={() => toggle("category")}
      />
      <FilterSection
        title="Material"
        options={fiberOptions}
        value={fiberTab}
        onChange={(key) => {
          onFiberChange(key);
        }}
        open={openSection === "material"}
        onToggle={() => toggle("material")}
      />
    </aside>
  );
}
