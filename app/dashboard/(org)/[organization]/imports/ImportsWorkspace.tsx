"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ImportSummary } from "../../../../../lib/enterprise/import-ops";
import { IMPORT_PIPELINE_STAGES } from "../../../../../lib/enterprise/import-ops";
import {
  EntOpsEmptyState,
  EntOpsKpiRow,
  EntOpsPanel,
  EntOpsPrimaryButton,
  EntOpsSecondaryButton,
  EntOpsStatusPill,
} from "../../../components/EntOpsModuleUi";
import { entLinkClass } from "../../../components/EnterpriseUi";

type ImportRow = {
  id: string;
  filename: string;
  status: string;
  pipelineStage: string;
  summary: ImportSummary;
  errorCount: number;
  createdAt: string;
  finishedAt: string | null;
};

type ImportDetail = {
  import: {
    id: string;
    original_filename: string | null;
    status: string;
    summary: Record<string, unknown>;
    error_message: string | null;
    mapping: Record<string, string> | null;
    created_at: string;
    finished_at: string | null;
  };
  errors: Array<{
    id: string;
    row_number: number;
    field_key: string | null;
    error_code: string;
    message: string;
  }>;
  job: {
    started_at: string | null;
    finished_at: string | null;
  } | null;
};

const PATH_STAGES = IMPORT_PIPELINE_STAGES;

function importStatusTone(status: string, errorCount: number): "complete" | "review" | "open" | "neutral" {
  if (status === "failed" || errorCount > 0) return "review";
  if (status === "succeeded") return "complete";
  if (status === "processing") return "open";
  return "neutral";
}

function importStatusLabel(status: string, errorCount: number): string {
  if (status === "failed") return "Needs review";
  if (errorCount > 0 && status === "succeeded") return "Completed";
  if (status === "succeeded") return "Completed";
  if (status === "processing") return "Processing";
  return status;
}

function stageIndex(stage: string): number {
  const idx = PATH_STAGES.findIndex((s) => s.toLowerCase() === stage.toLowerCase());
  if (idx >= 0) return idx;
  if (stage === "Failed") return 0;
  return 0;
}

function formatDuration(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return "—";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function MiniPath({ currentStage }: { currentStage: string }) {
  const current = stageIndex(currentStage);
  return (
    <div className="ent-opsmod-import-path ent-opsmod-import-path--mini" aria-hidden>
      {PATH_STAGES.map((stage, index) => (
        <span key={stage} className={index <= current ? "is-done" : ""}>
          {stage}
          {index < PATH_STAGES.length - 1 ? " → " : ""}
        </span>
      ))}
    </div>
  );
}

function FullPath({ currentStage }: { currentStage: string }) {
  const current = stageIndex(currentStage);
  return (
    <ol className="ent-opsmod-import-path-full">
      {PATH_STAGES.map((stage, index) => (
        <li key={stage} className={index <= current ? "is-done" : index === current + 1 ? "is-active" : ""}>
          <span className="ent-opsmod-import-path-dot">{index <= current ? "✓" : index + 1}</span>
          <span className="ent-opsmod-import-path-label">{stage}</span>
        </li>
      ))}
    </ol>
  );
}


function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadImportErrorReport(detail: ImportDetail, summary: ImportSummary) {
  const header = ["Row", "Field", "Code", "Message"];
  const lines = detail.errors.map((err) =>
    [err.row_number, err.field_key || "", err.error_code, err.message]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  const meta = [
    "",
    `"Import","${(detail.import.original_filename || detail.import.id).replace(/"/g, '""')}"`,
    `"Status","${detail.import.status}"`,
    `"Total rows","${summary.rowsTotal || 0}"`,
    `"Row errors","${detail.errors.length}"`,
  ];
  downloadTextFile(
    `import-report-${detail.import.id.slice(0, 8)}.csv`,
    [header.join(","), ...lines, ...meta].join("\n")
  );
}
export function ImportsWorkspace({
  slug,
  items,
  detail,
  selectedId,
}: {
  slug: string;
  items: ImportRow[];
  detail: ImportDetail | null;
  selectedId: string | null;
}) {
  const base = `/dashboard/${slug}`;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let rows = items;
    if (filter === "errors") rows = rows.filter((r) => r.errorCount > 0 || r.status === "failed");
    if (filter === "completed") rows = rows.filter((r) => r.status === "succeeded");
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.filename.toLowerCase().includes(q));
    return rows;
  }, [items, search, filter]);

  const succeeded = items.filter((r) => r.status === "succeeded").length;
  const needsReview = items.filter((r) => r.status === "failed" || r.errorCount > 0).length;
  const rowsProcessed = items.reduce((sum, r) => sum + (r.summary.rowsProcessed || r.summary.rowsTotal || 0), 0);

  const summary = (detail?.import.summary || {}) as ImportSummary;
  const validRows = (summary.rowsProcessed || 0) - (detail?.errors.length || 0);
  const mapping = detail?.import.mapping || {};
  const mappedCount = Object.keys(mapping).length;

  function selectImport(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("import", id);
    router.replace(`${base}/imports?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="ent-opsmod-page">
      <EntOpsKpiRow
        items={[
          { id: "imports", label: "Imports", value: items.length, hint: "Total catalog imports", icon: "📄" },
          {
            id: "succeeded",
            label: "Succeeded",
            value: succeeded,
            hint: items.length ? `${Math.round((succeeded / items.length) * 100)}% success rate` : "—",
            icon: "✓",
          },
          {
            id: "review",
            label: "Needs review",
            value: needsReview,
            hint: needsReview > 0 ? "Requires attention" : "All clear",
            icon: "⚠",
          },
          {
            id: "rows",
            label: "Rows processed",
            value: rowsProcessed.toLocaleString(),
            hint: "Across all imports",
            icon: "▥",
          },
        ]}
      />

      <div className="ent-opsmod-split">
        <EntOpsPanel title="Import history" className="ent-opsmod-split-main">
          <div className="ent-opsmod-toolbar">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search imports…"
              className="ent-opsmod-search"
              aria-label="Search imports"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="ent-select ent-opsmod-filter"
              aria-label="Filter imports"
            >
              <option value="all">All imports</option>
              <option value="completed">Completed</option>
              <option value="errors">With errors</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <EntOpsEmptyState
              icon="📄"
              title="No imports yet"
              body="Upload a catalog CSV to begin ingesting product data."
              ctaHref={`${base}/products?import=1`}
              ctaLabel="Import catalog →"
            />
          ) : (
            <ul className="ent-opsmod-import-list">
              {filtered.map((item) => {
                const selected = item.id === selectedId;
                const tone = importStatusTone(item.status, item.errorCount);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`ent-opsmod-import-row ${selected ? "is-selected" : ""}`}
                      onClick={() => selectImport(item.id)}
                    >
                      <span className="ent-opsmod-import-row-icon" aria-hidden>
                        📄
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="ent-opsmod-import-filename">{item.filename}</p>
                          <EntOpsStatusPill tone={tone}>{importStatusLabel(item.status, item.errorCount)}</EntOpsStatusPill>
                        </div>
                        <p className="ent-opsmod-import-meta">
                          {new Date(item.createdAt).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {(item.summary.rowsTotal || item.summary.rowsProcessed)
                            ? ` · ${(item.summary.rowsTotal || item.summary.rowsProcessed)?.toLocaleString()} rows`
                            : ""}
                        </p>
                        <MiniPath currentStage={item.pipelineStage} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </EntOpsPanel>

        <EntOpsPanel className="ent-opsmod-split-detail">
          {!detail ? (
            <EntOpsEmptyState
              icon="📄"
              title="Select an import"
              body="Choose an import from the list to inspect processing, row errors, and source mapping."
            />
          ) : (
            <div className="ent-opsmod-import-detail">
              <div className="ent-opsmod-import-detail-head">
                <div>
                  <h3 className="ent-serif ent-opsmod-detail-title">{detail.import.original_filename || "Import"}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <EntOpsStatusPill tone={importStatusTone(detail.import.status, detail.errors.length)}>
                      {importStatusLabel(detail.import.status, detail.errors.length)}
                    </EntOpsStatusPill>
                    <span className="ent-opsmod-detail-meta">
                      {new Date(detail.import.created_at).toLocaleString("en-GB")}
                    </span>
                    <span className="ent-opsmod-detail-meta">
                      {formatDuration(detail.job?.started_at || detail.import.created_at, detail.import.finished_at)}
                    </span>
                  </div>
                </div>
              </div>

              <FullPath currentStage={items.find((i) => i.id === detail.import.id)?.pipelineStage || "Completed"} />

              <div className="ent-opsmod-stat-grid">
                {[
                  ["Total rows", (summary.rowsTotal || 0).toLocaleString()],
                  ["Valid rows", Math.max(0, validRows).toLocaleString()],
                  ["Rows with issues", detail.errors.length.toLocaleString()],
                  ["Rows skipped", (summary.rowsSkipped || 0).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} className="ent-opsmod-stat-block">
                    <p className="ent-opsmod-stat-label">{label}</p>
                    <p className="ent-opsmod-stat-value">{value}</p>
                  </div>
                ))}
              </div>

              <div className="ent-opsmod-action-row">
                <EntOpsSecondaryButton href={`${base}/products?import=1`}>Replay import</EntOpsSecondaryButton>
                <EntOpsSecondaryButton
                  onClick={() => downloadImportErrorReport(detail, summary)}
                >
                  Download report
                </EntOpsSecondaryButton>
                <EntOpsSecondaryButton href={`${base}/imports/${detail.import.id}`}>View import detail</EntOpsSecondaryButton>
              </div>

              {detail.import.status === "succeeded" ? (
                <p className="ent-opsmod-success-note">
                  Import completed successfully
                  {detail.errors.length ? ` with ${detail.errors.length} non-blocking row issues.` : "."}
                </p>
              ) : null}

              <div className="ent-opsmod-detail-grid">
                <div className="ent-opsmod-subpanel">
                  <h4 className="ent-opsmod-subpanel-title">Row errors ({detail.errors.length})</h4>
                  {detail.errors.length === 0 ? (
                    <p className="text-sm text-[var(--ent-muted)]">No row-level errors recorded.</p>
                  ) : (
                    <div className="ent-opsmod-table-wrap">
                      <table className="ent-opsmod-table">
                        <thead>
                          <tr>
                            <th>Row</th>
                            <th>Field</th>
                            <th>Issue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.errors.slice(0, 8).map((err) => (
                            <tr key={err.id}>
                              <td>{err.row_number}</td>
                              <td>{err.field_key || "—"}</td>
                              <td>{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="ent-opsmod-subpanel ent-opsmod-subpanel--accent">
                  <h4 className="ent-opsmod-subpanel-title">Source mapping</h4>
                  <dl className="ent-opsmod-dl">
                    <div>
                      <dt>Source file</dt>
                      <dd>{detail.import.original_filename || "—"}</dd>
                    </div>
                    <div>
                      <dt>Mapping profile</dt>
                      <dd>{mappedCount ? `${mappedCount} column${mappedCount === 1 ? "" : "s"} mapped` : "No mapping stored"}</dd>
                    </div>
                    <div>
                      <dt>Fields mapped</dt>
                      <dd>
                        {mappedCount
                          ? Object.entries(mapping)
                              .slice(0, 4)
                              .map(([source, target]) => `${source} → ${target}`)
                              .join(" · ")
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Import rules</dt>
                      <dd>Identifier reconciliation · composition validation</dd>
                    </div>
                  </dl>
                  <Link href={`${base}/imports/${detail.import.id}`} className={entLinkClass}>
                    View mapping →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </EntOpsPanel>
      </div>
    </div>
  );
}

export function ImportsPageHeader({ slug }: { slug: string }) {
  return (
    <div className="ent-opsmod-header-action">
      <EntOpsPrimaryButton href={`/dashboard/${slug}/products?import=1`}>+ Import catalog</EntOpsPrimaryButton>
    </div>
  );
}
