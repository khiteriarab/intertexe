"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { fiberSubtypesFor } from "../../lib/fiber-subtypes";
import { DesignerSearchFilter, type DesignerOption } from "./DesignerSearchFilter";

export type FilterOption<T extends string> = { key: T; label: string };

type SectionProps<T extends string> = {
  title: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (key: T) => void;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
};

function FilterSection<T extends string>({
  title,
  options,
  value,
  onChange,
  open,
  onToggle,
  children,
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
        <>
          <ul className="pb-2 space-y-0.5">
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
          {children}
        </>
      )}
    </div>
  );
}

function CollapsiblePanel({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/25">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[11px] uppercase tracking-[0.18em] font-medium text-foreground">
          {title}
        </span>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {summary && <span className="tracking-wide">{summary}</span>}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open && <div className="pb-4">{children}</div>}
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
  designers?: DesignerOption[];
  selectedDesigners?: string[];
  onDesignersChange?: (slugs: string[]) => void;
  selectedFiberSubtypes?: string[];
  onFiberSubtypesChange?: (subtypes: string[]) => void;
  moodOptions?: string[];
  selectedMood?: string | null;
  onMoodChange?: (mood: string | null) => void;
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
  designers = [],
  selectedDesigners = [],
  onDesignersChange,
  selectedFiberSubtypes = [],
  onFiberSubtypesChange,
  moodOptions = [],
  selectedMood = null,
  onMoodChange,
}: CatalogFilterSidebarProps<TFiber, TCategory>) {
  const [openSection, setOpenSection] = useState<
    "category" | "material" | "designer" | "mood" | null
  >("category");

  const toggle = (section: "category" | "material" | "designer" | "mood") => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const primaryFiber =
    fiberTab !== "all" ? String(fiberTab) : null;
  const subtypes = fiberSubtypesFor(primaryFiber);

  const toggleSubtype = (subtype: string) => {
    if (!onFiberSubtypesChange) return;
    const on = selectedFiberSubtypes.includes(subtype);
    onFiberSubtypesChange(
      on
        ? selectedFiberSubtypes.filter((s) => s !== subtype)
        : [...selectedFiberSubtypes, subtype]
    );
  };

  const designerSummary =
    selectedDesigners.length === 0
      ? undefined
      : selectedDesigners.length === 1
        ? designers.find((d) => d.slug === selectedDesigners[0])?.name ?? "1"
        : `${selectedDesigners.length} selected`;

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
        onChange={onCategoryChange}
        open={openSection === "category"}
        onToggle={() => toggle("category")}
      />
      <FilterSection
        title="Material"
        options={fiberOptions}
        value={fiberTab}
        onChange={(key) => {
          onFiberChange(key);
          onFiberSubtypesChange?.([]);
        }}
        open={openSection === "material"}
        onToggle={() => toggle("material")}
      >
        {primaryFiber && subtypes.length > 0 && onFiberSubtypesChange && (
          <div className="mt-1 mb-3 pl-4 border-l border-gray-100">
            <p className="text-xs tracking-widest text-gray-400 uppercase mb-2">Type</p>
            {subtypes.map((subtype) => (
              <button
                key={subtype}
                type="button"
                onClick={() => toggleSubtype(subtype)}
                className={`block w-full text-left text-sm py-1.5 ${
                  selectedFiberSubtypes.includes(subtype)
                    ? "font-medium text-black"
                    : "text-gray-500"
                }`}
              >
                {subtype}
              </button>
            ))}
          </div>
        )}
      </FilterSection>

      {onDesignersChange && designers.length > 0 && (
        <CollapsiblePanel
          title="Designer"
          summary={designerSummary}
          open={openSection === "designer"}
          onToggle={() => toggle("designer")}
        >
          <DesignerSearchFilter
            designers={designers}
            selected={selectedDesigners}
            onChange={onDesignersChange}
          />
        </CollapsiblePanel>
      )}

      {onMoodChange && moodOptions.length > 0 && (
        <CollapsiblePanel
          title="Mood"
          summary={selectedMood ?? undefined}
          open={openSection === "mood"}
          onToggle={() => toggle("mood")}
        >
          <ul className="space-y-2">
            <li>
              <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={!selectedMood}
                  onChange={() => onMoodChange(null)}
                  className="accent-foreground"
                />
                All moods
              </label>
            </li>
            {moodOptions.map((mood) => (
              <li key={mood}>
                <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMood === mood}
                    onChange={() => onMoodChange(selectedMood === mood ? null : mood)}
                    className="accent-foreground"
                  />
                  {mood}
                </label>
              </li>
            ))}
          </ul>
        </CollapsiblePanel>
      )}
    </aside>
  );
}
