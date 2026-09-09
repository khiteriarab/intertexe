"use client";

import { Fragment, useState } from "react";
import type { CategoryBenchmarkBundle } from "../../../lib/enterprise/category-benchmark";
import { EntVisualPanel } from "./EnterpriseModuleUi";

function formatIndex(index: number | null): string {
  if (index == null) return "—";
  return `${index > 0 ? "+" : ""}${index}`;
}

export function EntCategoryBenchmarkDrilldown({ bundle }: { bundle: CategoryBenchmarkBundle }) {
  const [expanded, setExpanded] = useState<string | null>(bundle.rows[0]?.category ?? null);

  return (
    <EntVisualPanel
      tone="cream"
      title="Category drill-down"
      subtitle={`Conversion index and material cohorts · ${bundle.selection.segmentLabel} · ${bundle.selection.marketLabel}`}
    >
      <div className="overflow-x-auto">
        <table className="ent-benchmark-table w-full text-left text-sm">
          <thead>
            <tr>
              <th>Category</th>
              <th>Products</th>
              <th>Published</th>
              <th>Ready</th>
              <th>Issues</th>
              <th>Conv. index</th>
            </tr>
          </thead>
          <tbody>
            {bundle.rows.map((row) => {
              const isOpen = expanded === row.category;
              return (
                <Fragment key={row.category}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        className="text-left font-medium text-[var(--ent-ink)] hover:text-[var(--ent-petrol-deep)]"
                        onClick={() => setExpanded(isOpen ? null : row.category)}
                        aria-expanded={isOpen}
                      >
                        {row.category}
                      </button>
                    </td>
                    <td className="tabular-nums text-[var(--ent-muted)]">{row.total}</td>
                    <td className="tabular-nums text-[var(--ent-muted)]">{row.published}</td>
                    <td className="tabular-nums text-[var(--ent-muted)]">{row.ready}</td>
                    <td className="tabular-nums text-[var(--ent-muted)]">{row.openIssues}</td>
                    <td className="tabular-nums">
                      {row.conversionStatus === "ok" && row.conversionIndex != null ? (
                        <span
                          className={
                            row.conversionIndex >= 0 ? "text-[var(--ent-forest)]" : "text-[var(--ent-raspberry)]"
                          }
                        >
                          {formatIndex(row.conversionIndex)}
                        </span>
                      ) : (
                        <span className="text-[var(--ent-muted-light)]">—</span>
                      )}
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr>
                      <td colSpan={6} className="!pt-0">
                        <div className="ent-panel-nested px-4 py-4 mt-1">
                          {row.materialCohorts.length ? (
                            <>
                              <p className="text-[11px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)] mb-3">
                                Material cohorts in {row.category}
                              </p>
                              <ul className="grid sm:grid-cols-2 gap-3">
                                {row.materialCohorts.map((cohort) => (
                                  <li
                                    key={cohort.cohortKey}
                                    className="flex items-start justify-between gap-3 text-sm border border-[var(--ent-line)] rounded-lg px-3 py-3 bg-white/60"
                                  >
                                    <div className="min-w-0">
                                      <p className="font-medium text-[var(--ent-ink-soft)]">{cohort.label}</p>
                                      <p className="text-xs text-[var(--ent-muted)] mt-1">{cohort.signal}</p>
                                    </div>
                                    <span
                                      className={`tabular-nums font-semibold shrink-0 ${
                                        cohort.tone === "up"
                                          ? "text-[var(--ent-forest)]"
                                          : cohort.tone === "down"
                                            ? "text-[var(--ent-raspberry)]"
                                            : "text-[var(--ent-muted-light)]"
                                      }`}
                                    >
                                      {formatIndex(cohort.index)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : (
                            <p className="text-sm text-[var(--ent-muted)]">
                              No governed material cohort data for this category yet. Passport stats above are from your
                              catalog.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </EntVisualPanel>
  );
}
