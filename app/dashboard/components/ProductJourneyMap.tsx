"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ProductJourney, JourneyNode } from "../../../lib/enterprise/product-journey";

type JourneyView = "overview" | "map" | "timeline";

function curvePath(from: JourneyNode, to: JourneyNode, height: number) {
  const x1 = from.x;
  const y1 = (from.y / 100) * height;
  const x2 = to.x;
  const y2 = (to.y / 100) * height;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 - 6;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export function ProductJourneyMap({ journey }: { journey: ProductJourney }) {
  const [view, setView] = useState<JourneyView>("map");
  const mapHeight = 240;
  const activeIndex = journey.nodes.findIndex((n) => n.status === "current");
  const highlightId = activeIndex >= 0 ? journey.nodes[activeIndex]?.id : journey.nodes.at(-1)?.id;

  return (
    <section className="ent-journey-hero">
      <div className="ent-journey-hero-grid">
        <div className="ent-journey-identity">
          <div className="ent-journey-photo-wrap">
            {journey.imageUrl ? (
              <Image
                src={journey.imageUrl}
                alt={journey.productName}
                fill
                sizes="(max-width: 768px) 100vw, 280px"
                className="object-cover"
                unoptimized
                priority
              />
            ) : (
              <div className="ent-journey-photo-fallback" aria-hidden />
            )}
          </div>

          <div className="ent-journey-qr-block">
            {journey.qrUrl && journey.publicId ? (
              <>
                <div className="ent-journey-qr-frame">
                  <QRCodeSVG value={journey.qrUrl} size={112} marginSize={1} />
                </div>
                <div className="min-w-0">
                  <p className="ent-journey-qr-label">
                    {journey.isPublished ? "Live passport QR" : "Preview QR · publish to activate"}
                  </p>
                  <p className="ent-journey-qr-id">{journey.publicId}</p>
                  <p className="ent-journey-qr-hint">
                    Scan with iPhone to open the consumer passport — origin through end of life.
                  </p>
                  <Link href={`/p/${journey.publicId}`} target="_blank" className="ent-journey-qr-link">
                    Open consumer page →
                  </Link>
                </div>
              </>
            ) : (
              <div className="ent-journey-qr-pending">
                <div className="ent-journey-qr-frame ent-journey-qr-frame--ghost">
                  <span className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)]">QR</span>
                </div>
                <p className="text-sm text-[var(--ent-muted)]">
                  Approve identity fields and publish the passport to generate the scannable QR your customer will use.
                </p>
              </div>
            )}
          </div>

          {journey.composition ? (
            <div className="ent-journey-composition">
              <p className="ent-journey-eyebrow">Material composition</p>
              <p className="ent-journey-composition-text">{journey.composition}</p>
              {journey.brand ? <p className="ent-journey-brand">{journey.brand}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="ent-journey-map-panel">
          <div className="ent-journey-map-header">
            <div>
              <p className="ent-journey-eyebrow">Line map · origin to end of life</p>
              <h2 className="ent-journey-map-title">Governed journey your customer sees</h2>
            </div>
            <div className="ent-journey-view-toggle" role="tablist" aria-label="Journey view">
              {(
                [
                  ["overview", "Overview"],
                  ["map", "Map"],
                  ["timeline", "Timeline"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  className={`ent-journey-view-btn ${view === id ? "is-active" : ""}`}
                  onClick={() => setView(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <p className="ent-journey-map-copy">
            Zoom out to see every lifecycle group, or open the map for the path from fiber source through QR scan,
            retail, care, and next life — the same story on the public passport.
          </p>

          {view === "overview" ? (
            <div className="ent-journey-overview-grid">
              {journey.nodes.map((node, index) => (
                <article
                  key={node.id}
                  className={`ent-journey-overview-card ent-journey-overview-card--${node.status}`}
                  aria-current={node.id === highlightId ? "step" : undefined}
                >
                  <p className="ent-journey-overview-index">{String(index + 1).padStart(2, "0")}</p>
                  <p className="ent-journey-overview-stage">{node.stage}</p>
                  <p className="ent-journey-overview-label">{node.label}</p>
                  <p className="ent-journey-overview-detail">{node.detail}</p>
                </article>
              ))}
            </div>
          ) : null}

          {view === "map" ? (
            <div className="ent-journey-map-canvas">
              <svg
                viewBox={`0 0 100 ${mapHeight}`}
                preserveAspectRatio="xMidYMid meet"
                className="ent-journey-map-svg"
                aria-hidden
              >
                <defs>
                  <linearGradient id="ent-journey-line" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(196, 167, 125, 0.45)" />
                    <stop offset="50%" stopColor="rgba(62, 98, 104, 0.55)" />
                    <stop offset="100%" stopColor="rgba(196, 167, 125, 0.85)" />
                  </linearGradient>
                </defs>

                {journey.nodes.slice(0, -1).map((node, index) => {
                  const next = journey.nodes[index + 1];
                  if (!next) return null;
                  const dimmed = node.status === "pending" || next.status === "pending";
                  return (
                    <path
                      key={`${node.id}-${next.id}`}
                      d={curvePath(node, next, mapHeight)}
                      fill="none"
                      stroke="url(#ent-journey-line)"
                      strokeWidth={dimmed ? 0.35 : 0.75}
                      strokeDasharray={dimmed ? "1.5 1.5" : undefined}
                      opacity={dimmed ? 0.45 : 0.95}
                    />
                  );
                })}

                {journey.nodes.map((node) => {
                  const y = (node.y / 100) * mapHeight;
                  const active = node.id === highlightId;
                  const pending = node.status === "pending";
                  return (
                    <g key={node.id}>
                      <circle
                        cx={node.x}
                        cy={y}
                        r={active ? 2.6 : 2}
                        fill={pending ? "rgba(255,255,255,0.55)" : "var(--ent-gold, #c4a77d)"}
                        stroke={active ? "var(--ent-petrol-deep, #3e6268)" : "rgba(26,31,34,0.18)"}
                        strokeWidth={0.45}
                      />
                      {active ? (
                        <circle cx={node.x} cy={y} r={4.2} fill="none" stroke="rgba(62,98,104,0.28)" strokeWidth={0.35} />
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              <ul className="ent-journey-node-labels">
                {journey.nodes.map((node) => (
                  <li
                    key={node.id}
                    className={`ent-journey-node-label ent-journey-node-label--${node.status} ent-journey-node-label--${node.labelAnchor}`}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  >
                    <span className="ent-journey-node-stage">{node.stage}</span>
                    <span className="ent-journey-node-name">{node.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {view === "timeline" ? (
            <ol className="ent-journey-timeline ent-journey-timeline--panel">
              {journey.nodes.map((node, index) => (
                <li
                  key={node.id}
                  className={`ent-journey-step ent-journey-step--${node.status}`}
                  aria-current={node.id === highlightId ? "step" : undefined}
                >
                  <div className="ent-journey-step-marker">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="ent-journey-step-body">
                    <p className="ent-journey-step-title">{node.label}</p>
                    <p className="ent-journey-step-detail">{node.detail}</p>
                    {node.timestamp ? <p className="ent-journey-step-time">{node.timestamp}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>

      {view !== "timeline" ? (
        <ol className="ent-journey-timeline">
          {journey.nodes.map((node, index) => (
            <li
              key={node.id}
              className={`ent-journey-step ent-journey-step--${node.status}`}
              aria-current={node.id === highlightId ? "step" : undefined}
            >
              <div className="ent-journey-step-marker">
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="ent-journey-step-body">
                <p className="ent-journey-step-title">{node.label}</p>
                <p className="ent-journey-step-detail">{node.detail}</p>
                {node.timestamp ? <p className="ent-journey-step-time">{node.timestamp}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
