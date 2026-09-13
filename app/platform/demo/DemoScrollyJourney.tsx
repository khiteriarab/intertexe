"use client";

import { useState } from "react";
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

function ChapterShell({
  chapter,
  title,
  headline,
  copy,
  children,
  dark = false,
}: {
  chapter: string;
  title: string;
  headline: string;
  copy: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <article className={`demo-tour-chapter ${dark ? "demo-tour-chapter--dark" : ""}`}>
      <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-8 lg:gap-14 items-start">
        <div className={dark ? "lg:sticky lg:top-28" : "lg:sticky lg:top-28 lg:self-start"}>
          <p className="demo-tour-chapter-num">
            {chapter} · {title}
          </p>
          <h3
            className={`text-[1.65rem] sm:text-[2rem] font-light leading-[1.12] mb-4 ${dark ? "text-white" : ""}`}
            style={SERIF}
          >
            {headline}
          </h3>
          <p className={`text-[15px] leading-relaxed font-light ${dark ? "text-white/70" : "text-[var(--platform-muted)]"}`}>
            {copy}
          </p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </article>
  );
}

export function DemoScrollyJourney() {
  const [openIssue, setOpenIssue] = useState(SAMPLE_ISSUES[0].id);
  const stats = demoCatalogStats();
  const featured = DEMO_FEATURED_PRODUCT;

  return (
    <section id="journey" className="scroll-mt-28 mb-8">
      <div className="mb-10 sm:mb-14">
        <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">The INTERTEXE flow</p>
        <h2 className="text-[1.75rem] sm:text-3xl font-light max-w-2xl leading-[1.15]" style={SERIF}>
          One product. A complete lifecycle.
        </h2>
        <p className="mt-4 text-[15px] text-[var(--platform-muted)] font-light max-w-xl">
          Scroll through six editorial chapters — from messy source data to the passport your customer scans.
        </p>
      </div>

      <ChapterShell
        chapter={DEMO_WORKFLOW[0].chapter}
        title={DEMO_WORKFLOW[0].title}
        headline="Fragmented inputs, one product."
        copy="PLM abbreviations, ERP exports, spreadsheets and supplier declarations — preserved as submitted, converging on one style."
      >
        <div className="rounded-2xl border border-[var(--platform-border)] bg-white p-5 sm:p-6 shadow-[0_20px_50px_rgba(22,21,19,0.05)]">
          <div className="demo-tour-source-grid mb-4">
            {[
              ["PLM", "92 SE 8 EA"],
              ["ERP", "96% silk 4% elastane"],
              ["Spreadsheet", "100% silk"],
              ["Supplier file", "Atelier Nord · Milan"],
            ].map(([label, raw]) => (
              <div key={label} className="demo-tour-source-card">
                {label}
                <code>{raw}</code>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-2 py-3 text-[var(--platform-accent)]" aria-hidden>
            <span className="text-xs">↓</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--platform-border)] bg-[#faf8f4]">
            <img src={DEMO_FEATURED.image} alt="" width={48} height={60} className="w-12 h-15 object-cover rounded-md" />
            <div>
              <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-primary)]">Governed product record</p>
              <p className="text-sm" style={SERIF}>
                {featured.name}
              </p>
              <p className="text-[11px] text-[var(--platform-muted)]">{featured.sku}</p>
            </div>
          </div>
        </div>
      </ChapterShell>

      <ChapterShell
        chapter={DEMO_WORKFLOW[1].chapter}
        title={DEMO_WORKFLOW[1].title}
        headline="Messy strings become structured intelligence."
        copy="INTERTEXE normalizes fiber codes, preserves the original source string, and attaches evidence status — without overwriting what the brand sent."
      >
        <div className="demo-tour-split">
          <div className="demo-tour-messy">
            <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-2">Submitted</p>
            {featured.source.main}
          </div>
          <div className="demo-tour-clean">
            <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-primary)] mb-3">INTERTEXE</p>
            <p className="text-lg mb-3" style={SERIF}>
              {featured.name}
            </p>
            <p className="text-sm mb-2">{featured.normalized.shell}</p>
            <p className="text-sm mb-2">Origin · {featured.normalized.origin}</p>
            <p className="text-sm mb-2">Identifier · {featured.normalized.identifier}</p>
            <p className="text-xs text-[var(--platform-quiet)]">Evidence · Verified label · Source retained</p>
          </div>
        </div>
      </ChapterShell>

      <ChapterShell
        chapter={DEMO_WORKFLOW[2].chapter}
        title={DEMO_WORKFLOW[2].title}
        headline="Issues surfaced, never hidden."
        copy="An elegant inbox — three sample alerts from the 10-product catalog. Click to see how resolution preserves source data."
      >
        <div className="space-y-2">
          {SAMPLE_ISSUES.map((row) => {
            const open = openIssue === row.id;
            return (
              <div key={row.id}>
                <button
                  type="button"
                  onClick={() => setOpenIssue(open ? "" : row.id)}
                  className={`demo-tour-issue ${open ? "demo-tour-issue--open" : ""}`}
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
      </ChapterShell>

      <ChapterShell
        chapter={DEMO_WORKFLOW[3].chapter}
        title={DEMO_WORKFLOW[3].title}
        headline="Analysis, not administration."
        copy={`${featured.name} — material intelligence, compliance readiness, traceability fields, and next-life signals from the same governed record.`}
      >
        {PLATFORM_GRAPHICS.demoIntelligence.ready ? (
          <PlatformGraphic slot="demoIntelligence" />
        ) : (
          <div className="demo-tour-intel-grid">
            {[
              ["Material mix", featured.normalized.shell],
              ["Compliance readiness", "DPP fields complete"],
              ["Traceability", featured.normalized.origin || "—"],
              ["Resale readiness", DEMO_FEATURED.resalePotential],
            ].map(([label, value]) => (
              <div key={label} className="demo-tour-intel-metric">
                <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-2">{label}</p>
                <p className="text-sm text-[var(--platform-ink)]">{value}</p>
              </div>
            ))}
          </div>
        )}
      </ChapterShell>

      <ChapterShell
        chapter={DEMO_WORKFLOW[4].chapter}
        title={DEMO_WORKFLOW[4].title}
        headline="The benchmark moment."
        copy="Compare fiber mix, completeness, and passport readiness against governed peer segments — the aha before publish."
        dark
      >
        {PLATFORM_GRAPHICS.compareBenchmark.ready ? (
          <PlatformGraphic slot="compareBenchmark" className="rounded-xl overflow-hidden" />
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                ["Natural fiber share", stats.natural == null ? "—" : `${stats.natural}%`, "48% peer"],
                ["Passport ready", `${stats.ready}%`, "41% peer"],
                ["Complete material data", `${stats.complete}%`, "73% peer"],
                ["Silk assortment", `${stats.silkShare}%`, "9% peer"],
              ].map(([metric, you, peer]) => (
                <div key={metric} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-[9px] tracking-[0.12em] uppercase text-white/50 mb-2">{metric}</p>
                  <p className="text-2xl font-light text-white" style={SERIF}>
                    {you}
                  </p>
                  <p className="text-xs text-white/50 mt-1">Peer median · {peer}</p>
                </div>
              ))}
            </div>
            <img
              src="/platform/compare-benchmark.png"
              alt="Material Benchmark comparison"
              width={1200}
              height={800}
              className="w-full rounded-lg border border-white/10"
            />
          </div>
        )}
        <p className="mt-4 text-xs text-white/50">Illustrative peer medians · governed datasets only</p>
      </ChapterShell>

      <ChapterShell
        chapter={DEMO_WORKFLOW[5].chapter}
        title={DEMO_WORKFLOW[5].title}
        headline="What the customer sees."
        copy="Publish the Digital Product Passport — QR on the garment resolves to composition, care, origin, traceability, and next-life options."
      >
        <div className="grid sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] gap-6 items-start">
          <div className="rounded-[2rem] border-[6px] border-[#161513] bg-[#161513] overflow-hidden max-w-[260px] mx-auto sm:mx-0 shadow-[0_32px_64px_rgba(22,21,19,0.12)]">
            <div className="bg-[#faf8f4] px-4 py-2 flex justify-center">
              <span className="h-1 w-12 rounded-full bg-[#ddd5cb]" />
            </div>
            <img src={DEMO_FEATURED.image} alt={DEMO_FEATURED.name} width={260} height={340} className="w-full aspect-[3/4] object-cover" />
            <div className="bg-white p-4 space-y-2">
              <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">Digital Product Passport</p>
              <p className="text-base" style={SERIF}>
                {DEMO_FEATURED.name}
              </p>
              <p className="text-xs text-[var(--platform-muted)]">{DEMO_FEATURED.composition}</p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {["Care", "Origin", "Traceability", "Resale", "Recycle"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] tracking-[0.08em] uppercase px-2 py-1 rounded-full border border-[var(--platform-border)] text-[var(--platform-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--platform-border)] bg-white px-3 py-2">
              <span className="h-8 w-8 rounded-md border border-[var(--platform-border)] grid place-items-center text-[8px] font-mono">
                QR
              </span>
              <span className="text-xs text-[var(--platform-muted)]">Stable identity · {DEMO_FEATURED.sku}</span>
            </div>
            <p className="text-[10px] tracking-[0.16em] uppercase text-[var(--platform-quiet)]">Delivery modes</p>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_MODES.map((mode) => (
                <span
                  key={mode.label}
                  className="inline-flex flex-col px-4 py-3 rounded-xl border border-[var(--platform-border)] bg-white min-w-[120px]"
                >
                  <span className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-primary)]">{mode.label}</span>
                  <span className="text-[11px] text-[var(--platform-muted)] mt-1">{mode.detail}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </ChapterShell>
    </section>
  );
}
