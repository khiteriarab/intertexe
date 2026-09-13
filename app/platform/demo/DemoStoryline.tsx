"use client";

import { useState, type ReactNode } from "react";
import {
  DEMO_CATALOG,
  DEMO_ISSUE_LABEL,
  DEMO_WORKFLOW,
  demoCatalogStats,
} from "../../../lib/material-intelligence/demo-catalog";
import { DEMO_FEATURED, DEMO_FEATURED_PRODUCT } from "../../../lib/material-intelligence/demo-featured";
import { PlatformGraphic } from "../PlatformGraphic";
import { SERIF } from "../platform-ui";
import { PLATFORM_GRAPHICS } from "../../../lib/platform-graphics";

const SAMPLE_ISSUES = [
  {
    id: "evidence",
    product: DEMO_CATALOG.find((p) => p.id === "cotton-poplin-shirt")!,
    kind: "missing_evidence" as const,
    detail: "Retailer claim on file — attach label scan or supplier certificate before publish.",
  },
  {
    id: "invalid",
    product: DEMO_CATALOG.find((p) => p.id === "wool-trouser")!,
    kind: "invalid_total" as const,
    detail: "Composition totals 105%. Source strings preserved — resolve before passport publish.",
  },
  {
    id: "supplier",
    product: DEMO_CATALOG.find((p) => p.id === "viscose-slip")!,
    kind: "missing_supplier" as const,
    detail: "Manufacturing country present. Supplier field blank on submitted record.",
  },
];

const DELIVERY_MODES = [
  { label: "Hosted", detail: "INTERTEXE-hosted passport" },
  { label: "White-label", detail: "passport.yourbrand.com" },
  { label: "Headless API", detail: "Your app · website · tools" },
] as const;

function EditorialChapter({
  chapter,
  title,
  headline,
  copy,
  children,
  alt = false,
}: {
  chapter: string;
  title: string;
  headline: string;
  copy: string;
  children: ReactNode;
  alt?: boolean;
}) {
  return (
    <article className={`demo-editorial-chapter ${alt ? "demo-editorial-chapter--alt" : ""}`}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-14 lg:py-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-8 lg:gap-14 items-start">
          <div className="lg:sticky lg:top-28 lg:self-start mb-8 lg:mb-0">
            <p className="demo-editorial-chapter-meta">
              {chapter} · {title}
            </p>
            <h3
              className="text-[1.65rem] sm:text-[2rem] lg:text-[2.15rem] font-light leading-[1.12] mb-4 text-[var(--platform-ink)]"
              style={SERIF}
            >
              {headline}
            </h3>
            <p className="text-[15px] leading-relaxed font-light text-[var(--platform-muted)] max-w-md">{copy}</p>
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </article>
  );
}

export function DemoStoryline() {
  const [openIssue, setOpenIssue] = useState(SAMPLE_ISSUES[0].id);
  const stats = demoCatalogStats();
  const featured = DEMO_FEATURED_PRODUCT;

  return (
    <section id="journey" className="demo-editorial-storyline scroll-mt-24 border-y border-[var(--platform-border)]/70">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-12 sm:pt-14 lg:pt-16 pb-4">
        <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">Follow the record</p>
        <h2 className="text-[1.75rem] sm:text-[2.35rem] font-light max-w-2xl leading-[1.12] mb-3" style={SERIF}>
          One product. A complete lifecycle.
        </h2>
        <p className="text-[15px] text-[var(--platform-muted)] font-light max-w-xl">
          Six editorial chapters on {DEMO_FEATURED.name} — from messy source data to the passport your customer scans.
        </p>
      </div>

      <EditorialChapter
        chapter={DEMO_WORKFLOW[0].chapter}
        title={DEMO_WORKFLOW[0].title}
        headline="Fragmented inputs, one product."
        copy="PLM abbreviations, ERP exports, spreadsheets and supplier declarations — preserved as submitted, converging on one style."
      >
        <div className="demo-editorial-panel">
          <div className="demo-editorial-source-grid">
            {[
              ["PLM", "92 SE 8 EA"],
              ["ERP", "96% silk 4% elastane"],
              ["Spreadsheet", "100% silk"],
              ["Supplier file", "Atelier Nord · Milan"],
            ].map(([label, raw]) => (
              <div key={label} className="demo-editorial-source-card">
                {label}
                <code>{raw}</code>
              </div>
            ))}
          </div>
          <div className="demo-editorial-source-arrow" aria-hidden>
            ↓
          </div>
          <div className="demo-editorial-record-chip">
            <img src={DEMO_FEATURED.image} alt="" width={48} height={60} className="demo-editorial-record-chip-image" />
            <div>
              <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-primary)]">Governed product record</p>
              <p className="text-sm text-[var(--platform-ink)]" style={SERIF}>
                {featured.name}
              </p>
              <p className="text-[11px] text-[var(--platform-muted)]">{featured.sku}</p>
            </div>
          </div>
        </div>
      </EditorialChapter>

      <EditorialChapter
        chapter={DEMO_WORKFLOW[1].chapter}
        title={DEMO_WORKFLOW[1].title}
        headline="Messy strings become structured intelligence."
        copy="INTERTEXE normalizes fiber codes, preserves the original source string, and attaches evidence status — without overwriting what the brand sent."
        alt
      >
        <div className="demo-editorial-split">
          <div className="demo-editorial-messy">
            <p className="demo-editorial-split-label">Submitted</p>
            {featured.source.main}
          </div>
          <div className="demo-editorial-clean">
            <p className="demo-editorial-split-label demo-editorial-split-label--accent">INTERTEXE</p>
            <p className="text-lg mb-3 text-[var(--platform-ink)]" style={SERIF}>
              {featured.name}
            </p>
            <p className="text-sm mb-2 text-[var(--platform-muted)]">{featured.normalized.shell}</p>
            <p className="text-sm mb-2 text-[var(--platform-muted)]">Origin · {featured.normalized.origin}</p>
            <p className="text-sm mb-2 text-[var(--platform-muted)]">Identifier · {featured.normalized.identifier}</p>
            <p className="text-xs text-[var(--platform-quiet)]">Evidence · Verified label · Source retained</p>
          </div>
        </div>
      </EditorialChapter>

      <EditorialChapter
        chapter={DEMO_WORKFLOW[2].chapter}
        title={DEMO_WORKFLOW[2].title}
        headline="Issues surfaced, never hidden."
        copy="An elegant inbox — sample alerts from the catalog. Click to see how resolution preserves source data."
      >
        <div className="space-y-2">
          {SAMPLE_ISSUES.map((row) => {
            const open = openIssue === row.id;
            return (
              <div key={row.id}>
                <button
                  type="button"
                  onClick={() => setOpenIssue(open ? "" : row.id)}
                  className={`demo-editorial-issue ${open ? "demo-editorial-issue--open" : ""}`}
                >
                  <div className="flex justify-between gap-3 items-start">
                    <div className="text-left">
                      <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-quiet)] mb-1">
                        {row.product.sku}
                      </p>
                      <p className="text-sm text-[var(--platform-ink)]">{DEMO_ISSUE_LABEL[row.kind]}</p>
                    </div>
                    <span className="text-[var(--platform-quiet)] text-lg leading-none">{open ? "−" : "+"}</span>
                  </div>
                  {open ? (
                    <div className="mt-4 pt-4 border-t border-[var(--platform-border)] text-left">
                      <p className="text-sm text-[var(--platform-muted)] mb-3">{row.detail}</p>
                      <p className="text-xs font-mono text-[var(--platform-quiet)] bg-[#f7f5f1] px-3 py-2 rounded-md">
                        Source · {row.product.source.main}
                      </p>
                    </div>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      </EditorialChapter>

      <EditorialChapter
        chapter={DEMO_WORKFLOW[3].chapter}
        title={DEMO_WORKFLOW[3].title}
        headline="Analysis, not administration."
        copy={`${featured.name} — material intelligence, compliance readiness, traceability fields, and next-life signals from the same governed record.`}
        alt
      >
        {PLATFORM_GRAPHICS.demoIntelligence.ready ? (
          <PlatformGraphic slot="demoIntelligence" />
        ) : (
          <div className="demo-editorial-intel-grid">
            {[
              ["Material mix", featured.normalized.shell],
              ["Compliance readiness", "DPP fields complete"],
              ["Traceability", featured.normalized.origin || "—"],
              ["Resale readiness", DEMO_FEATURED.resalePotential],
            ].map(([label, value]) => (
              <div key={label} className="demo-editorial-intel-metric">
                <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-2">{label}</p>
                <p className="text-sm text-[var(--platform-ink)]">{value}</p>
              </div>
            ))}
          </div>
        )}
      </EditorialChapter>

      <EditorialChapter
        chapter={DEMO_WORKFLOW[4].chapter}
        title={DEMO_WORKFLOW[4].title}
        headline="The benchmark moment."
        copy="Compare fiber mix, completeness, and passport readiness against governed peer segments — the aha before publish."
      >
        {PLATFORM_GRAPHICS.compareBenchmark.ready ? (
          <PlatformGraphic slot="compareBenchmark" className="rounded-xl overflow-hidden border border-[var(--platform-border)]" />
        ) : (
          <div className="demo-editorial-panel">
            <div className="demo-editorial-intel-grid mb-5">
              {[
                ["Natural fiber share", stats.natural == null ? "—" : `${stats.natural}%`, "48% peer"],
                ["Passport ready", `${stats.ready}%`, "41% peer"],
                ["Complete material data", `${stats.complete}%`, "73% peer"],
                ["Silk assortment", `${stats.silkShare}%`, "9% peer"],
              ].map(([metric, you, peer]) => (
                <div key={metric} className="demo-editorial-intel-metric">
                  <p className="text-[9px] tracking-[0.12em] uppercase text-[var(--platform-quiet)] mb-2">{metric}</p>
                  <p className="text-2xl font-light text-[var(--platform-ink)]" style={SERIF}>
                    {you}
                  </p>
                  <p className="text-xs text-[var(--platform-muted)] mt-1">Peer median · {peer}</p>
                </div>
              ))}
            </div>
            <img
              src="/platform/compare-benchmark.png"
              alt="Material Benchmark comparison"
              width={1200}
              height={800}
              className="w-full rounded-lg border border-[var(--platform-border)]"
            />
          </div>
        )}
        <p className="mt-4 text-xs text-[var(--platform-quiet)]">Illustrative peer medians · governed datasets only</p>
      </EditorialChapter>

      <EditorialChapter
        chapter={DEMO_WORKFLOW[5].chapter}
        title={DEMO_WORKFLOW[5].title}
        headline="What the customer sees."
        copy="Publish the Digital Product Passport — QR on the garment resolves to composition, care, origin, traceability, and next-life options."
        alt
      >
        <div className="grid sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] gap-6 items-start">
          <div className="demo-editorial-phone">
            <div className="demo-editorial-phone-notch" />
            <img src={DEMO_FEATURED.image} alt={DEMO_FEATURED.name} width={260} height={340} className="demo-editorial-phone-image" />
            <div className="demo-editorial-phone-body">
              <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">Digital Product Passport</p>
              <p className="text-base text-[var(--platform-ink)]" style={SERIF}>
                {DEMO_FEATURED.name}
              </p>
              <p className="text-xs text-[var(--platform-muted)]">{DEMO_FEATURED.composition}</p>
              <div className="demo-editorial-phone-tags">
                {["Care", "Origin", "Traceability", "Resale", "Recycle"].map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="demo-editorial-qr-chip">
              <span className="demo-editorial-qr-chip-icon">QR</span>
              <span className="text-xs text-[var(--platform-muted)]">Stable identity · {DEMO_FEATURED.sku}</span>
            </div>
            <p className="text-[10px] tracking-[0.16em] uppercase text-[var(--platform-quiet)]">Delivery modes</p>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_MODES.map((mode) => (
                <span key={mode.label} className="demo-editorial-delivery-chip">
                  <span>{mode.label}</span>
                  <span>{mode.detail}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </EditorialChapter>
    </section>
  );
}
