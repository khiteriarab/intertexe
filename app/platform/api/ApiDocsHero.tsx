"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { lookupDemoRecord } from "../../../lib/material-intelligence/demo-records";
import { DEMO_FEATURED } from "../../../lib/material-intelligence/demo-featured";
import { PrimaryLink, SecondaryLink, SERIF } from "../platform-ui";
import { demoCurl, jsExample, pythonExample, SAMPLE_GTINS } from "./api-docs-shared";

type CodeTab = "curl" | "javascript" | "python";

const TRUST = ["Real products", "Trusted data", "Structured intelligence"] as const;

export function ApiDocsHero() {
  const [tab, setTab] = useState<CodeTab>("curl");
  const sample = useMemo(() => lookupDemoRecord(SAMPLE_GTINS.verified), []);

  const code =
    tab === "curl" ? demoCurl() : tab === "javascript" ? jsExample() : pythonExample();

  return (
    <section className="api-docs-page -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 pt-10 sm:pt-14 lg:pt-16 pb-12 sm:pb-16 border-b border-[var(--platform-border)]">
      <div className="max-w-[1280px] mx-auto grid lg:grid-cols-[minmax(0,42%)_minmax(0,58%)] gap-10 lg:gap-14 xl:gap-16 items-center">
        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-6">
            Material Intelligence API
          </p>
          <h1
            className="text-[2.2rem] sm:text-[2.75rem] xl:text-[3.25rem] font-light leading-[1.06] tracking-[-0.02em] mb-5"
            style={SERIF}
          >
            Governed material intelligence, available by API.
          </h1>
          <p className="text-[16px] sm:text-[17px] font-light leading-relaxed text-[var(--platform-muted)] max-w-md mb-8">
            A GTIN or product identifier resolves to normalized fibre composition, evidence status, and DPP-readiness —
            structured intelligence your PIM, PLM, or passport workflow can consume.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <PrimaryLink href="/platform/demo#api">Try live lookup</PrimaryLink>
            <SecondaryLink href="/api/openapi.json">Download OpenAPI 3.1</SecondaryLink>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {TRUST.map((item) => (
              <li key={item} className="text-[9px] tracking-[0.18em] uppercase text-[var(--platform-quiet)]">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="api-docs-hero-visual">
          <img
            src="/platform/hero-product-window.png"
            alt=""
            aria-hidden
            width={1200}
            height={800}
            className="api-docs-hero-fabric"
          />
          <div className="api-docs-hero-stage">
            <div className="api-docs-gtin-card">
              <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-2">Identifier</p>
              <p className="font-mono text-sm text-[var(--platform-ink)] mb-3">{SAMPLE_GTINS.verified}</p>
              <div className="h-8 bg-[repeating-linear-gradient(90deg,#161513_0_2px,transparent_2px_4px)] opacity-70 rounded-sm" aria-hidden />
              <p className="text-[10px] text-[var(--platform-muted)] mt-2">GTIN-13 · checksum valid</p>
            </div>

            <span className="api-docs-flow-arrow" aria-hidden>
              →
            </span>

            <div className="space-y-3 min-w-0">
              <div className="api-docs-code-panel">
                <div className="api-docs-code-tabs" role="tablist" aria-label="Code example">
                  {(
                    [
                      ["curl", "cURL"],
                      ["javascript", "JavaScript"],
                      ["python", "Python"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={tab === id}
                      onClick={() => setTab(id)}
                      className={`api-docs-code-tab ${tab === id ? "api-docs-code-tab--active" : ""}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <pre className="api-docs-code-pre">
                  <code>{code}</code>
                </pre>
              </div>

              {sample ? (
                <div className="api-docs-result-card">
                  <div className="flex gap-3 items-start">
                    <img
                      src={DEMO_FEATURED.image}
                      alt=""
                      width={56}
                      height={70}
                      className="w-14 h-[70px] object-cover rounded-md shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[9px] tracking-[0.12em] uppercase text-[var(--platform-quiet)]">Result</p>
                      <p className="text-sm text-[var(--platform-ink)] truncate" style={SERIF}>
                        {sample.product.name}
                      </p>
                      <p className="text-[11px] text-[var(--platform-muted)] mt-0.5">
                        {sample.composition.components.map((c) => `${c.percentage}% ${c.fiber_name}`).join(" · ")}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[9px] tracking-[0.08em] uppercase px-2 py-0.5 rounded-full border border-[#e4edea] bg-[#e4edea] text-[#2c4a3e]">
                          {sample.evidence.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-[9px] tracking-[0.08em] uppercase px-2 py-0.5 rounded-full border border-[var(--platform-border)] text-[var(--platform-muted)]">
                          DPP · {sample.dpp_alignment.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <p className="max-w-[1280px] mx-auto mt-8 text-center text-xs text-[var(--platform-quiet)]">
        <Link href="#overview" className="underline underline-offset-4 hover:text-[var(--platform-primary)]">
          GTIN in, governed intelligence out →
        </Link>
      </p>
    </section>
  );
}
