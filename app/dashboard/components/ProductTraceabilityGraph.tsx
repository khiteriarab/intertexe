"use client";

import { useMemo, useState } from "react";
import type { ProductTraceability } from "../../../lib/enterprise/traceability";
import {
  buildProductTraceabilityGraph,
  type TraceGraphNode,
} from "../../../lib/enterprise/product-traceability-graph";

export function ProductTraceabilityGraph({
  traceability,
  productName,
  compact = false,
}: {
  traceability: ProductTraceability;
  productName?: string | null;
  compact?: boolean;
}) {
  const graph = useMemo(
    () => buildProductTraceabilityGraph(traceability, productName),
    [traceability, productName]
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    graph.nodes.find((n) => n.status === "verified")?.id || graph.nodes[graph.nodes.length - 1]?.id || null
  );
  const selected = graph.nodes.find((n) => n.id === selectedId) || null;

  return (
    <div className={`ent-trace-graph ${compact ? "ent-trace-graph--compact" : ""}`}>
      {!compact ? (
      <div className="ent-trace-graph-summary">
        <div>
          <p className="ent-journey-eyebrow">Traceability completeness</p>
          <p className="ent-trace-pct">{graph.completenessPct}%</p>
          <p className="text-sm text-[var(--ent-muted)] mt-1">
            {graph.knownTierCount} of 4 tiers known · upstream at top
          </p>
        </div>
        {graph.warnings.length ? (
          <ul className="ent-trace-warnings">
            {graph.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </div>
      ) : null}

      <div className="ent-trace-graph-layout">
        <div className="ent-trace-graph-canvas" role="list" aria-label="Product traceability graph">
          {graph.nodes.map((node, index) => (
            <div key={node.id} className="ent-trace-graph-row" role="listitem">
              {index > 0 ? (
                <div
                  className={`ent-trace-graph-link ${
                    graph.edges[index - 1]?.verified ? "is-verified" : "is-incomplete"
                  }`}
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                className={`ent-trace-graph-node ent-trace-graph-node--${node.status} ent-trace-graph-node--${node.kind} ${
                  selectedId === node.id ? "is-selected" : ""
                }`}
                onClick={() => setSelectedId(node.id)}
                aria-pressed={selectedId === node.id}
              >
                <span className="ent-trace-graph-node-glyph" aria-hidden>
                  {glyphFor(node)}
                </span>
                <span className="ent-trace-graph-node-copy">
                  <span className="ent-trace-graph-node-label">{node.label}</span>
                  <span className="ent-trace-graph-node-role">{node.role}</span>
                </span>
              </button>
            </div>
          ))}
        </div>

        {!compact ? (
        <aside className="ent-trace-graph-detail" aria-live="polite">
          {selected ? (
            <>
              <p className="ent-journey-eyebrow">Node detail</p>
              <h3 className="ent-trace-graph-detail-title">{selected.label}</h3>
              <p className="ent-trace-graph-detail-role">{selected.role}</p>
              <dl className="ent-trace-graph-detail-grid">
                <div>
                  <dt>Verification</dt>
                  <dd>{selected.verificationLabel}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{selected.country || "—"}</dd>
                </div>
                <div>
                  <dt>Facility</dt>
                  <dd>{selected.facility || "—"}</dd>
                </div>
                <div>
                  <dt>Supplier</dt>
                  <dd>{selected.supplierName || "—"}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{selected.evidenceStatus || "—"}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{selected.confidence != null ? `${Math.round(selected.confidence * 100)}%` : "—"}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-[var(--ent-muted)]">Select a node to inspect evidence and verification.</p>
          )}
        </aside>
        ) : null}
      </div>
    </div>
  );
}

function glyphFor(node: TraceGraphNode): string {
  if (node.kind === "raw_material") return "◎";
  if (node.kind === "processing") return "◍";
  if (node.kind === "supplier") return "◇";
  if (node.kind === "manufacturing") return "▣";
  return "●";
}
