"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { TaxonomyMenuRow } from "../../lib/catalog-taxonomy";

export function CategoryMenuClient({
  title,
  subtitle,
  rows,
  showCounts = false,
  backHref = "/shop/hub",
  sectionLabel,
}: {
  title: string;
  subtitle?: string;
  rows: TaxonomyMenuRow[];
  showCounts?: boolean;
  backHref?: string;
  sectionLabel?: string;
}) {
  const allRow = rows.find((row) => row.pathSegment === "all");
  const categoryRows = rows.filter((row) => row.pathSegment !== "all");

  const renderRow = (row: TaxonomyMenuRow, prominent = false) => (
    <Link
      key={row.slug}
      href={row.href}
      className={`flex items-center justify-between touch-manipulation active:opacity-70 ${
        prominent
          ? "py-5 border border-border/60 bg-[#f8f7f5] px-4 mb-5 text-[18px] font-normal"
          : "py-5 border-b border-border/50 text-[17px] font-light"
      } text-foreground`}
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
  );

  return (
    <div className="min-h-[70vh] bg-background pb-28 md:pb-16" data-testid="category-menu">
      <div className="max-w-lg mx-auto px-4 md:px-6 pt-4 md:pt-10">
        <Link
          href={backHref}
          className="inline-flex items-center min-h-[44px] text-[11px] uppercase tracking-[0.28em] text-muted-foreground hover:text-foreground transition-colors mb-4 md:mb-6 touch-manipulation"
          data-testid="category-menu-back"
        >
          ← Menu
        </Link>

        <header className="mb-6 md:mb-8">
          {sectionLabel ? (
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground mb-2">{sectionLabel}</p>
          ) : null}
          <h1 className="text-[22px] md:text-[28px] font-serif font-normal tracking-tight text-foreground uppercase">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{subtitle}</p>
          ) : null}
        </header>

        <nav className="flex flex-col" aria-label={title}>
          {allRow ? renderRow(allRow, true) : null}
          {categoryRows.length > 0 ? (
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2 px-0.5">
              Shop by category
            </p>
          ) : null}
          {categoryRows.map((row) => renderRow(row))}
        </nav>
      </div>
    </div>
  );
}
