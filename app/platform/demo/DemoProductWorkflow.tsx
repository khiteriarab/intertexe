"use client";

import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  DEMO_CATALOG,
  DEMO_ISSUE_LABEL,
  demoCatalogStats,
} from "../../../lib/material-intelligence/demo-catalog";
import { DEMO_FEATURED, DEMO_FEATURED_PRODUCT } from "../../../lib/material-intelligence/demo-featured";
import { PlatformGraphic } from "../PlatformGraphic";
import { SERIF } from "../platform-ui";
import { PLATFORM_GRAPHICS } from "../../../lib/platform-graphics";

const FLOW_STEPS = [
  {
    id: "source",
    num: "01",
    title: "Source",
    headline: "Fragmented inputs, one product.",
    copy: "Ingest product data from PLM, ERP, suppliers, or your existing systems — preserved as submitted.",
  },
  {
    id: "normalize",
    num: "02",
    title: "Normalize",
    headline: "Messy strings become structured intelligence.",
    copy: "Clean, enrich, and standardize key product attributes and material composition without overwriting source strings.",
  },
  {
    id: "validate",
    num: "03",
    title: "Validate",
    headline: "Issues surfaced, never hidden.",
    copy: "Flag missing data, ensure compliance, and add verified evidence before anything reaches the consumer.",
  },
  {
    id: "publish",
    num: "04",
    title: "Publish",
    headline: "The passport is ready.",
    copy: "Create a digital product passport with QR resolution — composition, care, origin, traceability, and next-life options.",
  },
  {
    id: "activate",
    num: "05",
    title: "Activate",
    headline: "Power every channel.",
    copy: "Hosted passport, white-label domain, headless API — the same record powers your website, app, and resale partners.",
  },
  {
    id: "measure",
    num: "06",
    title: "Measure",
    headline: "Track, benchmark, improve.",
    copy: "Compare fiber mix, completeness, and passport readiness against governed peer segments over time.",
  },
] as const;

type FlowStepId = (typeof FLOW_STEPS)[number]["id"];

const SOURCE_INPUTS = [
  ["PLM", "92 SE 8 EA"],
  ["ERP", "96% silk 4% elastane"],
  ["Spreadsheet", "100% silk"],
  ["Supplier file", "Atelier Nord · Milan"],
] as const;

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

const CONSUMER_LANES = [
  { label: "Shop today", detail: "Buy with confidence" },
  { label: "Care longer", detail: "Instructions that travel with the garment" },
  { label: "Resale tomorrow", detail: "Identity follows the product" },
  { label: "Circular future", detail: "Impact and next-life options" },
] as const;

const DELIVERY_MODES = [
  { label: "Hosted", detail: "intertexe.com/p/…" },
  { label: "White-label", detail: "passport.yourbrand.com" },
  { label: "Headless API", detail: "GET /v1/passport" },
] as const;

function StepIcon({ id }: { id: FlowStepId }) {
  const cls = "h-4 w-4";
  if (id === "source") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      </svg>
    );
  }
  if (id === "normalize") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M12 3 14.5 8.5 20 9l-4 3.5L17 18l-5-3-5 3 1-5.5L4 9l5.5-.5L12 3Z" />
      </svg>
    );
  }
  if (id === "validate") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    );
  }
  if (id === "publish") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M12 3 20 7v10l-8 4-8-4V7l8-4Z" />
      </svg>
    );
  }
  if (id === "activate") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </svg>
  );
}

function WorkflowPanel({
  step,
  children,
  panelRef,
}: {
  step: (typeof FLOW_STEPS)[number];
  children: ReactNode;
  panelRef: (el: HTMLElement | null) => void;
}) {
  return (
    <article
      id={`workflow-${step.id}`}
      ref={panelRef}
      className="demo-workflow-panel scroll-mt-32"
      data-workflow-step={step.id}
    >
      <div className="demo-workflow-panel-inner">
        <p className="demo-workflow-panel-meta">
          {step.num} · {step.title}
        </p>
        <h3 className="demo-workflow-panel-title" style={SERIF}>
          {step.headline}
        </h3>
        <p className="demo-workflow-panel-copy">{step.copy}</p>
        <div className="demo-workflow-panel-visual">{children}</div>
      </div>
    </article>
  );
}

export function DemoProductWorkflow() {
  const featured = DEMO_FEATURED_PRODUCT;
  const stats = demoCatalogStats();
  const [activeStep, setActiveStep] = useState<FlowStepId>("source");
  const [openIssue, setOpenIssue] = useState(SAMPLE_ISSUES[0].id);
  const panelRefs = useRef<Record<string, HTMLElement | null>>({});
  const passportUrl = `/platform/api?gtin=${DEMO_FEATURED.gtin}`;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target instanceof HTMLElement) {
          const id = visible.target.dataset.workflowStep as FlowStepId | undefined;
          if (id) setActiveStep(id);
        }
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0.15, 0.35, 0.55] },
    );

    for (const step of FLOW_STEPS) {
      const el = panelRefs.current[step.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function scrollToStep(id: FlowStepId) {
    setActiveStep(id);
    document.getElementById(`workflow-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section id="journey" className="demo-workflow-chart scroll-mt-24 border-y border-[var(--platform-border)]/70">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-12 sm:pt-14 lg:pt-16 pb-6">
        <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">Follow the record</p>
        <h2 className="text-[1.75rem] sm:text-[2.35rem] font-light max-w-2xl leading-[1.12] mb-3" style={SERIF}>
          One product. A complete lifecycle.
        </h2>
        <p className="text-[15px] text-[var(--platform-muted)] font-light max-w-xl">
          Scroll the {DEMO_FEATURED.name} record through Source → Measure — from messy inputs to the passport your
          customer scans.
        </p>
      </div>

      <div className="demo-workflow-layout max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pb-12 sm:pb-16 lg:pb-20">
        <nav className="demo-workflow-rail" aria-label="Product workflow steps">
          <ol className="demo-workflow-rail-list">
            {FLOW_STEPS.map((step, index) => {
              const active = activeStep === step.id;
              return (
                <li key={step.id} className="demo-workflow-rail-item">
                  <button
                    type="button"
                    onClick={() => scrollToStep(step.id)}
                    aria-current={active ? "step" : undefined}
                    className={`demo-workflow-rail-btn ${active ? "is-active" : ""}`}
                  >
                    <span className="demo-workflow-rail-icon" aria-hidden>
                      <StepIcon id={step.id} />
                    </span>
                    <span className="demo-workflow-rail-text">
                      <span className="demo-workflow-rail-num">{step.num}</span>
                      <span className="demo-workflow-rail-title">{step.title}</span>
                    </span>
                  </button>
                  {index < FLOW_STEPS.length - 1 ? (
                    <span className="demo-workflow-rail-connector" aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ol>
          <div className="demo-workflow-rail-product">
            <img src={DEMO_FEATURED.image} alt="" width={40} height={50} className="demo-workflow-rail-product-image" />
            <div>
              <p className="text-[9px] tracking-[0.12em] uppercase text-[var(--platform-quiet)]">Featured product</p>
              <p className="text-[11px] text-[var(--platform-ink)]" style={SERIF}>
                {featured.name}
              </p>
              <p className="text-[10px] text-[var(--platform-muted)]">{featured.sku}</p>
            </div>
          </div>
        </nav>

        <div className="demo-workflow-panels">
          <WorkflowPanel step={FLOW_STEPS[0]} panelRef={(el) => { panelRefs.current.source = el; }}>
            <div className="demo-editorial-panel">
              <div className="demo-editorial-source-grid">
                {SOURCE_INPUTS.map(([label, raw]) => (
                  <div key={label} className="demo-editorial-source-card">
                    {label}
                    <code>{raw}</code>
                  </div>
                ))}
              </div>
              <div className="demo-workflow-flow-arrow" aria-hidden>
                ↓
              </div>
              <div className="demo-editorial-record-chip">
                <img src={DEMO_FEATURED.image} alt="" width={48} height={60} className="demo-editorial-record-chip-image" />
                <div>
                  <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-primary)]">Governed product record</p>
                  <p className="text-sm text-[var(--platform-ink)]" style={SERIF}>{featured.name}</p>
                  <p className="text-[11px] text-[var(--platform-muted)]">{featured.sku}</p>
                </div>
              </div>
            </div>
          </WorkflowPanel>

          <WorkflowPanel step={FLOW_STEPS[1]} panelRef={(el) => { panelRefs.current.normalize = el; }}>
            <div className="demo-editorial-split">
              <div className="demo-editorial-messy">
                <p className="demo-editorial-split-label">Submitted</p>
                {featured.source.main}
              </div>
              <span className="demo-workflow-flow-arrow demo-workflow-flow-arrow-inline" aria-hidden>→</span>
              <div className="demo-editorial-clean">
                <p className="demo-editorial-split-label demo-editorial-split-label--accent">INTERTEXE</p>
                <p className="text-lg mb-3 text-[var(--platform-ink)]" style={SERIF}>{featured.name}</p>
                <p className="text-sm mb-2 text-[var(--platform-muted)]">{featured.normalized.shell}</p>
                <p className="text-sm mb-2 text-[var(--platform-muted)]">Origin · {featured.normalized.origin}</p>
                <p className="text-sm mb-2 text-[var(--platform-muted)]">Identifier · {featured.normalized.identifier}</p>
                <p className="text-xs text-[var(--platform-quiet)]">Evidence · Verified label · Source retained</p>
              </div>
            </div>
          </WorkflowPanel>

          <WorkflowPanel step={FLOW_STEPS[2]} panelRef={(el) => { panelRefs.current.validate = el; }}>
            <div className="space-y-2">
              <div className="demo-workflow-featured-valid">
                <img src={DEMO_FEATURED.image} alt="" width={36} height={44} className="rounded-md object-cover" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--platform-primary)]">{featured.sku} · Ready</p>
                  <p className="text-sm text-[var(--platform-ink)]">{featured.name} — no blocking issues</p>
                </div>
                <span className="demo-workflow-valid-badge">✓</span>
              </div>
              <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] pt-2">Catalog inbox · sample alerts</p>
              {SAMPLE_ISSUES.map((row) => {
                const open = openIssue === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setOpenIssue(open ? "" : row.id)}
                    className={`demo-editorial-issue w-full text-left ${open ? "demo-editorial-issue--open" : ""}`}
                  >
                    <div className="flex justify-between gap-3 items-start">
                      <div>
                        <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-quiet)] mb-1">{row.product.sku}</p>
                        <p className="text-sm text-[var(--platform-ink)]">{DEMO_ISSUE_LABEL[row.kind]}</p>
                      </div>
                      <span className="text-[var(--platform-quiet)] text-lg leading-none">{open ? "−" : "+"}</span>
                    </div>
                    {open ? (
                      <div className="mt-4 pt-4 border-t border-[var(--platform-border)]">
                        <p className="text-sm text-[var(--platform-muted)] mb-3">{row.detail}</p>
                        <p className="text-xs font-mono text-[var(--platform-quiet)] bg-[#f7f5f1] px-3 py-2 rounded-md">Source · {row.product.source.main}</p>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </WorkflowPanel>

          <WorkflowPanel step={FLOW_STEPS[3]} panelRef={(el) => { panelRefs.current.publish = el; }}>
            <div className="demo-workflow-publish-grid">
              <div className="demo-workflow-passport-publish">
                <img src={DEMO_FEATURED.image} alt={DEMO_FEATURED.name} width={200} height={260} className="demo-workflow-passport-image" />
                <div className="demo-workflow-passport-meta">
                  <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">Digital Product Passport</p>
                  <p className="text-base text-[var(--platform-ink)]" style={SERIF}>{DEMO_FEATURED.name}</p>
                  <p className="text-xs text-[var(--platform-muted)]">{DEMO_FEATURED.composition}</p>
                  <div className="demo-editorial-phone-tags mt-3">
                    {["Care", "Origin", "Traceability", "Resale", "Recycle"].map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="demo-workflow-qr-block">
                  <QRCodeCanvas value={passportUrl} size={72} marginSize={1} />
                  <p className="text-[9px] tracking-[0.1em] uppercase text-[var(--platform-muted)] mt-2">Scan to view</p>
                  <Link href={`/platform/api?gtin=${DEMO_FEATURED.gtin}`} className="text-[10px] text-[var(--platform-accent)] underline underline-offset-4">
                    Open passport →
                  </Link>
                </div>
              </div>
              {PLATFORM_GRAPHICS.actPassport.ready ? (
                <PlatformGraphic slot="actPassport" className="rounded-xl overflow-hidden border border-[var(--platform-border)]" />
              ) : (
                <img src="/platform/act-passport.png" alt="Publish passport workspace" className="w-full rounded-xl border border-[var(--platform-border)]" />
              )}
            </div>
          </WorkflowPanel>

          <WorkflowPanel step={FLOW_STEPS[4]} panelRef={(el) => { panelRefs.current.activate = el; }}>
            <div className="demo-workflow-consumer">
              <div className="demo-workflow-consumer-scan">
                <div className="demo-workflow-scan-tag">
                  <span className="demo-workflow-scan-label">100% LINEN</span>
                  <span className="demo-workflow-scan-hint">Scan the tag</span>
                </div>
                <span className="demo-workflow-flow-arrow demo-workflow-flow-arrow-inline" aria-hidden>→</span>
                <div className="demo-editorial-phone demo-workflow-consumer-phone">
                  <div className="demo-editorial-phone-notch" />
                  <img src={DEMO_FEATURED.image} alt="" width={220} height={280} className="demo-editorial-phone-image" />
                  <div className="demo-editorial-phone-body">
                    <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">Digital Product Passport</p>
                    <p className="text-sm text-[var(--platform-ink)]" style={SERIF}>{DEMO_FEATURED.name}</p>
                    <QRCodeCanvas value={passportUrl} size={40} marginSize={0} />
                  </div>
                </div>
              </div>
              <div className="demo-workflow-consumer-lanes">
                {CONSUMER_LANES.map((lane) => (
                  <div key={lane.label} className="demo-workflow-consumer-lane">
                    <span className="demo-workflow-consumer-lane-dot" aria-hidden />
                    <div>
                      <p className="text-[11px] text-[var(--platform-ink)]">{lane.label}</p>
                      <p className="text-[10px] text-[var(--platform-muted)]">{lane.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="demo-workflow-delivery-row">
                {DELIVERY_MODES.map((mode) => (
                  <span key={mode.label} className="demo-editorial-delivery-chip">
                    <span>{mode.label}</span>
                    <span>{mode.detail}</span>
                  </span>
                ))}
              </div>
            </div>
          </WorkflowPanel>

          <WorkflowPanel step={FLOW_STEPS[5]} panelRef={(el) => { panelRefs.current.measure = el; }}>
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
                      <p className="text-2xl font-light text-[var(--platform-ink)]" style={SERIF}>{you}</p>
                      <p className="text-xs text-[var(--platform-muted)] mt-1">Peer median · {peer}</p>
                    </div>
                  ))}
                </div>
                <img src="/platform/compare-benchmark.png" alt="Material Benchmark" className="w-full rounded-lg border border-[var(--platform-border)]" />
              </div>
            )}
            <p className="mt-4 text-xs text-[var(--platform-quiet)]">Illustrative peer medians · governed datasets only</p>
          </WorkflowPanel>
        </div>
      </div>
    </section>
  );
}
