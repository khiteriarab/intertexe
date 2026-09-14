"use client";

import Link from "next/link";
import { useState } from "react";
import type { SupplierRow } from "../../../../../lib/enterprise/module-queries";
import { collaborationStatusLabel } from "../../../../../lib/enterprise/issue-taxonomy";
import { formatRelativeActivityTime } from "../../../../../lib/enterprise/display-format";
import {
  EntOpsEmptyState,
  EntOpsKpiRow,
  EntOpsPanel,
  EntOpsPrimaryButton,
  EntOpsStatusPill,
} from "../../../components/EntOpsModuleUi";
import { EntProductPlaceholder, entLinkClass } from "../../../components/EnterpriseUi";

type CollaborationRequest = {
  id: string;
  title: string;
  status: string;
  collaborationStatus: string;
  requestKind: string | null;
  productId: string | null;
  supplierName: string;
  dueAt: string | null;
  createdAt?: string;
  body?: string | null;
};

type LinkedProduct = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  passportState: string | null;
  imageUrl: string | null;
};

function lifecycleStage(status: string, index: number): { done: boolean; label: string; date: string | null } {
  const labels = ["Sent", "Viewed", "Responded", "Reviewed"];
  const normalized = status.toLowerCase();
  const doneByStatus =
    normalized.includes("review") || normalized === "closed"
      ? 4
      : normalized.includes("respond") || normalized.includes("submit")
        ? 3
        : normalized.includes("view")
          ? 2
          : 1;
  return {
    done: index < doneByStatus,
    label: labels[index] || "",
    date: index === 0 ? "Recorded" : index < doneByStatus ? "Complete" : null,
  };
}

export function SuppliersWorkspace({
  slug,
  suppliers,
  summary,
  requests,
  productsById,
  avgResponseDays = null,
}: {
  slug: string;
  suppliers: SupplierRow[];
  summary: {
    total: number;
    withProducts: number;
    openRequests: number;
    openSupplierIssues: number;
  };
  requests: CollaborationRequest[];
  productsById: Record<string, LinkedProduct>;
  avgResponseDays?: number | null;
}) {
  const base = `/dashboard/${slug}`;
  const [expandedId, setExpandedId] = useState<string | null>(suppliers[0]?.id ?? null);

  const activeRequest = requests[0] ?? null;
  const activeSupplier = activeRequest
    ? suppliers.find((s) => s.name === activeRequest.supplierName) || suppliers[0]
    : suppliers[0];

  const responseRate =
    summary.total > 0
      ? Math.round(((summary.total - summary.openRequests) / summary.total) * 100)
      : 100;

  return (
    <div className="ent-opsmod-page">
      <EntOpsKpiRow
        items={[
          { id: "total", label: "Total suppliers", value: summary.total, icon: "👥" },
          { id: "linked", label: "With linked products", value: summary.withProducts, icon: "🔗" },
          { id: "open", label: "Open requests", value: summary.openRequests, icon: "📄" },
          {
            id: "issues",
            label: "Open supplier issues",
            value: summary.openSupplierIssues,
            hint: summary.openSupplierIssues > 0 ? "Needs attention" : "Clear",
            icon: "⚠",
          },
        ]}
      />

      <div className="ent-opsmod-suppliers-top">
        <EntOpsPanel
          title="Active requests"
          action={
            requests.length > 1 ? (
              <Link href="#supplier-requests-list" className={entLinkClass}>
                View all requests →
              </Link>
            ) : null
          }
          className="ent-opsmod-suppliers-requests"
          id="supplier-requests-list"
        >
          {!activeRequest ? (
            <EntOpsEmptyState
              icon="🏭"
              title="No active supplier requests"
              body="Evidence requests appear here when you ask suppliers to provide documentation for a product."
              ctaHref={`${base}/issues`}
              ctaLabel="Review issues →"
            />
          ) : (
            <article className="ent-opsmod-request-card">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="ent-serif ent-opsmod-request-title">{activeRequest.title}</h3>
                <EntOpsStatusPill tone="open">{activeRequest.status.toUpperCase()}</EntOpsStatusPill>
              </div>
              <p className="ent-opsmod-request-meta">
                {activeRequest.supplierName}
                {activeRequest.requestKind ? ` · ${activeRequest.requestKind.replaceAll("_", " ")}` : ""}
                {activeRequest.dueAt ? ` · due ${new Date(activeRequest.dueAt).toLocaleDateString("en-GB")}` : ""}
              </p>
              <p className="ent-opsmod-request-body">
                {activeRequest.body ||
                  "Supplier evidence is required before this product can move toward publication. Review the response when it arrives."}
              </p>
              <ol className="ent-opsmod-lifecycle">
                {["Sent", "Viewed", "Responded", "Reviewed"].map((label, index) => {
                  const stage = lifecycleStage(activeRequest.collaborationStatus, index);
                  return (
                    <li key={label} className={stage.done ? "is-done" : ""}>
                      <span className="ent-opsmod-lifecycle-dot">{stage.done ? "✓" : index + 1}</span>
                      <span className="ent-opsmod-lifecycle-label">{label}</span>
                      <span className="ent-opsmod-lifecycle-date">
                        {index === 0 && activeRequest.createdAt
                          ? new Date(activeRequest.createdAt).toLocaleDateString("en-GB")
                          : stage.date || "—"}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {activeRequest.productId ? (
                <Link href={`${base}/products/${activeRequest.productId}?tab=suppliers`} className={entLinkClass}>
                  Open product →
                </Link>
              ) : null}
            </article>
          )}
          {requests.length > 1 ? (
            <ul className="ent-opsmod-request-list mt-4">
              {requests.slice(1).map((request) => (
                <li key={request.id} className="ent-opsmod-request-list-item">
                  <Link href={request.productId ? `${base}/products/${request.productId}?tab=suppliers` : `${base}/issues?issueType=supplier`} className={entLinkClass}>
                    {request.title}
                  </Link>
                  <span className="ent-opsmod-request-list-meta">
                    {request.supplierName}
                    {request.dueAt ? ` · due ${new Date(request.dueAt).toLocaleDateString("en-GB")}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </EntOpsPanel>

        <EntOpsPanel title="Supplier performance" subtitle="Last 90 days" className="ent-opsmod-suppliers-performance">
          <ul className="ent-opsmod-performance-list">
            <li>
              <span>Response rate</span>
              <strong>{responseRate}%</strong>
            </li>
            <li>
              <span>Avg. response time</span>
              <strong>{avgResponseDays != null ? `${avgResponseDays} day${avgResponseDays === 1 ? "" : "s"}` : "—"}</strong>
            </li>
            <li>
              <span>Linked products</span>
              <strong>{activeSupplier?.productCount || 0} active</strong>
            </li>
            <li>
              <span>Last activity</span>
              <strong>
                {activeSupplier?.lastActivityAt
                  ? formatRelativeActivityTime(activeSupplier.lastActivityAt)
                  : "—"}
              </strong>
            </li>
          </ul>
          {summary.openRequests === 0 && summary.total > 0 ? (
            <div className="ent-opsmod-collaborator-banner">
              <p className="ent-opsmod-collaborator-title">Active collaborator</p>
              <p className="ent-opsmod-collaborator-body">This supplier is engaged and responding to evidence requests.</p>
            </div>
          ) : null}
        </EntOpsPanel>
      </div>

      <EntOpsPanel
        title="Supplier list"
        action={<EntOpsPrimaryButton href={`${base}/issues?issueType=supplier`}>Request evidence →</EntOpsPrimaryButton>}
      >
        {suppliers.length === 0 ? (
          <EntOpsEmptyState
            icon="🏭"
            title="No supplier relationships yet"
            body="Suppliers appear when you request evidence on a product issue, or when supplier records are created through your workflow."
            ctaHref={`${base}/issues`}
            ctaLabel="Review issues →"
          />
        ) : (
          <ul className="ent-opsmod-supplier-list">
            {suppliers.map((supplier) => {
              const expanded = expandedId === supplier.id;
              const product = supplier.productIds[0] ? productsById[supplier.productIds[0]] : null;
              return (
                <li key={supplier.id} className="ent-opsmod-supplier-item">
                  <button
                    type="button"
                    className="ent-opsmod-supplier-row"
                    onClick={() => setExpandedId(expanded ? null : supplier.id)}
                  >
                    <span className="ent-opsmod-supplier-avatar">{supplier.name.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="ent-opsmod-supplier-name">{supplier.name}</p>
                      <p className="ent-opsmod-supplier-email">{supplier.email || "—"}</p>
                    </div>
                    <EntOpsStatusPill tone="complete">Active</EntOpsStatusPill>
                    <div className="ent-opsmod-supplier-stats text-right">
                      <p>{supplier.productCount} linked</p>
                      <p>{supplier.openRequestCount} open</p>
                    </div>
                  </button>
                  {expanded && product ? (
                    <div className="ent-opsmod-linked-product">
                      <EntProductPlaceholder category={product.category} imageUrl={product.imageUrl} alt={product.name} />
                      <div className="min-w-0 flex-1">
                        <p className="ent-opsmod-linked-name">{product.name}</p>
                        <p className="ent-opsmod-linked-meta">
                          {product.sku || "—"} · {product.category || "—"} · {product.passportState || "—"}
                        </p>
                      </div>
                      <Link href={`${base}/products/${product.id}`} className={entLinkClass}>
                        View product →
                      </Link>
                    </div>
                  ) : null}
                  {supplier.lastActivityAt ? (
                    <p className="ent-opsmod-supplier-activity">
                      Last activity {formatRelativeActivityTime(supplier.lastActivityAt)} ·{" "}
                      {collaborationStatusLabel(supplier.outstandingCount > 0 ? "open" : "closed")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </EntOpsPanel>
    </div>
  );
}
