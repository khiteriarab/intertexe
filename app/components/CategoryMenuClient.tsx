"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { TaxonomyMenuRow } from "../../lib/catalog-taxonomy";

export function CategoryMenuClient({
  title,
  subtitle,
  rows,
  showCounts = false,
}: {
  title: string;
  subtitle?: string;
  rows: TaxonomyMenuRow[];
  showCounts?: boolean;
}) {
  return (
    <div className="min-h-[70vh] bg-background pb-28 md:pb-16" data-testid="category-menu">
      <div className="max-w-lg mx-auto px-4 md:px-6 pt-6 md:pt-10">
        <header className="mb-8">
          <h1 className="text-[28px] md:text-[32px] font-serif font-normal tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{subtitle}</p>
          ) : null}
        </header>

        <nav className="flex flex-col" aria-label={title}>
          {rows.map((row) => (
            <Link
              key={row.slug}
              href={row.href}
              className="flex items-center justify-between py-5 border-b border-border/50 text-[17px] font-light text-foreground touch-manipulation active:opacity-70"
              data-testid={`category-row-${row.pathSegment}`}
            >
              <span>{row.label}</span>
              <span className="flex items-center gap-2 text-muted-foreground">
                {showCounts && row.liveCount != null && row.liveCount > 0 ? (
                  <span className="text-[11px] tabular-nums tracking-wide">{row.liveCount.toLocaleString()}</span>
                ) : null}
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.25} />
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
