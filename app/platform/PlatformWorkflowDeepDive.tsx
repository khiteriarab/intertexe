"use client";

import Link from "next/link";
import { useState } from "react";
import { PlatformCaseStudyQr } from "./b2b-visuals/PlatformCaseStudyQr";
import { PlatformGraphic } from "./PlatformGraphic";
import { PLATFORM_GRAPHICS } from "../../lib/platform-graphics";
import { Body, Eyebrow, Heading, SERIF } from "./platform-ui";

type WorkflowTab = "normalize" | "connect" | "understand" | "publish";

const TABS: { id: WorkflowTab; label: string }[] = [
  { id: "normalize", label: "Normalize & Resolve" },
  { id: "connect", label: "Connect" },
  { id: "understand", label: "Understand" },
  { id: "publish", label: "Publish" },
];

const NORMALIZE_POINTS = [
  "Standardize fields and formats",
  "Detect and resolve conflicts",
  "Enrich with trusted data",
] as const;

export function PlatformWorkflowDeepDive() {
  const [tab, setTab] = useState<WorkflowTab>("normalize");

  return (
    <section id="workflow" className="scroll-mt-28 itx-abstract-section itx-abstract-motif bg-white border-y border-[#e8e3da] py-12 sm:py-16 lg:py-20">
      <div className="max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
          <div className="max-w-2xl">
            <Eyebrow>The INTERTEXE workflow</Eyebrow>
            <Heading className="mb-3">From messy source files to governed product records.</Heading>
            <Body className="mb-0">
              Turn supplier data into clean, trusted material records and consumer-ready product passports — all in one
              platform.
            </Body>
          </div>
          <Link
            href="/platform/demo#journey"
            className="text-[11px] tracking-[0.14em] uppercase text-[var(--platform-muted)] underline underline-offset-4 shrink-0"
          >
            See the full workflow →
          </Link>
        </div>

        <div
          role="tablist"
          aria-label="Workflow stages"
          className="flex flex-wrap gap-2 mb-8 pb-2 border-b border-[var(--platform-border)]"
        >
          {TABS.map((item) => {
            const selected = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(item.id)}
                className={`px-4 py-2 min-h-[40px] text-[11px] tracking-[0.12em] uppercase rounded-full border transition-colors ${
                  selected
                    ? "bg-[var(--platform-accent-soft)] text-[var(--platform-primary)] border-[var(--platform-accent-muted)]"
                    : "bg-white text-[var(--platform-muted)] border-[var(--platform-border)] hover:text-[var(--platform-ink)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === "normalize" ? (
          <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-8 lg:gap-12 items-start">
            <div>
              <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--platform-quiet)] mb-2">02 – 03</p>
              <h3 className="text-2xl font-light text-[var(--platform-ink)] mb-4" style={SERIF}>
                Normalize &amp; Resolve
              </h3>
              <p className="text-[15px] text-[var(--platform-muted)] font-light leading-relaxed mb-6">
                Clean, standardize, and enrich supplier data while preserving original values. Conflicts surface in an
                inbox — never overwritten silently.
              </p>
              <ul className="space-y-3 mb-6">
                {NORMALIZE_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-[var(--platform-muted)]">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--platform-accent)] shrink-0" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href="/platform/demo#journey"
                className="text-[11px] tracking-[0.14em] uppercase underline underline-offset-4 text-[var(--platform-accent)]"
              >
                Learn more about Normalize &amp; Resolve →
              </Link>
            </div>
            <div className="platform-workflow-flow grid md:grid-cols-3 gap-4">
              <article className="rounded-xl border border-[var(--platform-border)] bg-white p-4 shadow-sm">
                <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-3">Supplier file (raw)</p>
                <div className="rounded-lg border border-[var(--platform-border)] bg-[#faf8f4] p-3 font-mono text-[11px] text-[var(--platform-muted)] space-y-2">
                  <p>supplier_fabric_line_sheet.xlsx</p>
                  <p>70% Linen 30% Cotton</p>
                  <p className="text-[var(--platform-quiet)]">Origin · blank</p>
                </div>
                <p className="mt-3 text-[11px] text-rose-800 bg-rose-50 border border-rose-100 rounded-md px-3 py-2">
                  Messy, inconsistent and incomplete supplier data.
                </p>
              </article>
              <article className="rounded-xl border border-[var(--platform-border)] bg-white p-4 shadow-sm">
                <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-3">Issues detected</p>
                <ul className="space-y-2 text-[11px] text-[var(--platform-muted)]">
                  <li className="flex justify-between gap-2 border-b border-[var(--platform-border)] pb-2">
                    <span>Composition mismatch</span>
                    <span className="text-rose-700">!</span>
                  </li>
                  <li className="flex justify-between gap-2 border-b border-[var(--platform-border)] pb-2">
                    <span>Missing evidence</span>
                    <span className="text-amber-700">!</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Missing field</span>
                    <span className="text-amber-700">!</span>
                  </li>
                </ul>
                <Link
                  href="/platform/demo#journey"
                  className="mt-4 inline-block text-[10px] tracking-[0.12em] uppercase underline underline-offset-4"
                >
                  Review all issues →
                </Link>
              </article>
              <article className="rounded-xl border border-[var(--platform-border)] bg-white p-4 shadow-sm">
                <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-3">Normalized material record</p>
                <div className="rounded-lg border border-[var(--platform-border)] bg-[#faf8f4] p-3 text-[11px] space-y-2">
                  <p className="text-[var(--platform-primary)]">60% Linen · 40% Cotton</p>
                  <p className="text-[var(--platform-muted)]">Origin · Portugal</p>
                  <p className="text-[var(--platform-muted)]">Source retained · v2 approved</p>
                </div>
                <p className="mt-3 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
                  Clean, standardized and governed material record.
                </p>
              </article>
            </div>
          </div>
        ) : null}

        {tab === "connect" ? (
          <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-8 items-center">
            <div>
              <h3 className="text-2xl font-light text-[var(--platform-ink)] mb-4" style={SERIF}>
                Connect fragmented sources
              </h3>
              <p className="text-[15px] text-[var(--platform-muted)] font-light leading-relaxed">
                PLM, ERP, spreadsheets and supplier feeds into one workspace — provenance preserved, conflicts surfaced,
                never overwritten.
              </p>
            </div>
            <img
              src="/platform/hero-workspace-desktop.png"
              alt="INTERTEXE workspace overview"
              width={1400}
              height={933}
              className="w-full rounded-xl border border-[var(--platform-border)] shadow-[0_24px_60px_rgba(22,21,19,0.08)]"
              loading="lazy"
            />
          </div>
        ) : null}

        {tab === "understand" ? (
          <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-8 items-start">
            <div>
              <h3 className="text-2xl font-light text-[var(--platform-ink)] mb-4" style={SERIF}>
                Benchmark material strategy
              </h3>
              <p className="text-[15px] text-[var(--platform-muted)] font-light leading-relaxed mb-4">
                Compare fiber mix, completeness, and passport readiness against governed peer segments — with conversion
                signals that show what is working.
              </p>
              <Link
                href="/platform/demo#journey"
                className="text-[11px] tracking-[0.14em] uppercase underline underline-offset-4 text-[var(--platform-accent)]"
              >
                Explore in demo →
              </Link>
            </div>
            {PLATFORM_GRAPHICS.compareBenchmark.ready ? (
              <PlatformGraphic slot="compareBenchmark" />
            ) : null}
          </div>
        ) : null}

        {tab === "publish" ? (
          <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-8 lg:gap-12 items-start">
            <div>
              <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--platform-quiet)] mb-2">From material to market</p>
              <h3 className="text-2xl font-light text-[var(--platform-ink)] mb-4" style={SERIF}>
                Publish with confidence.
              </h3>
              <p className="text-[15px] text-[var(--platform-muted)] font-light leading-relaxed mb-6">
                Create a persistent product identity and deliver it through hosted passports, white-label experiences, or
                headless API — preview and verify before go-live.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                {[
                  ["Hosted passport", "Branded consumer experience"],
                  ["White-label", "Your brand, your domain"],
                  ["Headless API", "Integrate anywhere"],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-lg border border-[var(--platform-border)] bg-[#faf8f4] p-3">
                    <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-primary)] mb-1">{title}</p>
                    <p className="text-[11px] text-[var(--platform-muted)]">{detail}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/platform/demo#live-passport"
                className="text-[11px] tracking-[0.14em] uppercase underline underline-offset-4 text-[var(--platform-accent)]"
              >
                Explore Publish →
              </Link>
            </div>
            <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] gap-6 items-start">
              {PLATFORM_GRAPHICS.actPassport.ready ? (
                <PlatformGraphic slot="actPassport" />
              ) : null}
              <PlatformCaseStudyQr compact />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
