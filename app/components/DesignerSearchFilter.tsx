"use client";

import { useMemo, useState } from "react";

export type DesignerOption = {
  slug: string;
  name: string;
  count?: number;
};

type DesignerSearchFilterProps = {
  designers: DesignerOption[];
  selected: string[];
  onChange: (slugs: string[]) => void;
  maxVisible?: number;
};

export function DesignerSearchFilter({
  designers,
  selected,
  onChange,
  maxVisible = 20,
}: DesignerSearchFilterProps) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () => [...designers].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)),
    [designers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? sorted.filter(
          (d) =>
            d.name.toLowerCase().includes(q) || d.slug.toLowerCase().includes(q)
        )
      : sorted;
    return list.slice(0, maxVisible);
  }, [sorted, query, maxVisible]);

  const toggle = (slug: string) => {
    const on = selected.includes(slug);
    onChange(on ? selected.filter((s) => s !== slug) : [...selected, slug]);
  };

  return (
    <div className="space-y-3" data-testid="designer-search-filter">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search designers"
        className="w-full border border-border/40 px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-foreground/15"
        data-testid="input-designer-search"
      />
      <ul className="space-y-0.5 max-h-[220px] overflow-y-auto">
        {filtered.map((d) => {
          const checked = selected.includes(d.slug);
          return (
            <li key={d.slug}>
              <button
                type="button"
                onClick={() => toggle(d.slug)}
                className={`w-full text-left py-2 text-[12px] flex items-center justify-between gap-2 transition-colors ${
                  checked
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`designer-option-${d.slug}`}
              >
                <span>{d.name}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {d.count != null && d.count > 0 && (
                    <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                      {d.count}
                    </span>
                  )}
                  {checked && (
                    <span className="text-[10px] uppercase tracking-wider">✓</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="text-[12px] text-muted-foreground py-2">No designers found</li>
        )}
      </ul>
    </div>
  );
}
