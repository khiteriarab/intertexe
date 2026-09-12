"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import type { ProductJourney, JourneyNode } from "../../../lib/enterprise/product-journey";

function curvePath(from: JourneyNode, to: JourneyNode, height: number) {
  const x1 = from.x;
  const y1 = (from.y / 100) * height;
  const x2 = to.x;
  const y2 = (to.y / 100) * height;
  const cx = (x1 + x2) / 2;
  const cy = Math.min(y1, y2) - 8;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export function ProductJourneyMap({ journey }: { journey: ProductJourney }) {
  const mapHeight = 220;
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
            {journey.qrUrl ? (
              <>
                <div className="ent-journey-qr-frame">
                  <QRCodeSVG value={journey.qrUrl} size={96} marginSize={1} />
                </div>
                <div className="min-w-0">
                  <p className="ent-journey-qr-label">Passport QR</p>
                  <p className="ent-journey-qr-id">{journey.publicId || "—"}</p>
                  <p className="ent-journey-qr-hint">Scan links material record to this item</p>
                </div>
              </>
            ) : (
              <div className="ent-journey-qr-pending">
                <div className="ent-journey-qr-frame ent-journey-qr-frame--ghost">
                  <span className="text-[10px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)]">QR</span>
                </div>
                <p className="text-sm text-[var(--ent-muted)]">
                  Publish the passport to generate the QR identity tied to this product.
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
          <p className="ent-journey-eyebrow">Line map · conception to sale</p>
          <h2 className="ent-journey-map-title">From fiber source to point of sale</h2>
          <p className="ent-journey-map-copy">
            Each node is a verified stage in this product&apos;s material journey. Lines connect recorded origin,
            manufacturing, passport publish, QR identity, and retail endpoint.
          </p>

          <div className="ent-journey-map-canvas">
            <svg
              viewBox={`0 0 100 ${mapHeight}`}
              preserveAspectRatio="none"
              className="ent-journey-map-svg"
              aria-hidden
            >
              <defs>
                <linearGradient id="ent-journey-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(196, 167, 125, 0.35)" />
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
                    strokeWidth={dimmed ? 0.35 : 0.65}
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
                      r={active ? 2.8 : 2.2}
                      fill={pending ? "rgba(255,255,255,0.5)" : "var(--ent-gold, #c4a77d)"}
                      stroke={active ? "var(--ent-petrol-deep, #3e6268)" : "rgba(26,31,34,0.15)"}
                      strokeWidth={0.4}
                    />
                    {active ? (
                      <circle cx={node.x} cy={y} r={4.5} fill="none" stroke="rgba(62,98,104,0.25)" strokeWidth={0.35} />
                    ) : null}
                  </g>
                );
              })}
            </svg>

            <ul className="ent-journey-node-labels">
              {journey.nodes.map((node) => (
                <li
                  key={node.id}
                  className={`ent-journey-node-label ent-journey-node-label--${node.status}`}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <span className="ent-journey-node-stage">{node.stage}</span>
                  <span className="ent-journey-node-name">{node.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

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
    </section>
  );
}
