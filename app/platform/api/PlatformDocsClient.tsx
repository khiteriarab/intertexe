"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEMO_GTIN_MISSING,
  DEMO_GTIN_REPORTED,
  DEMO_GTIN_VERIFIED,
} from "../../../lib/material-intelligence/demo-records";
import { DPP_ALIGNMENT_NOTICE } from "../../../lib/material-intelligence/types";
import { SERIF } from "../platform-ui";
import { ApiAccessCards } from "./ApiAccessCards";
import { ApiCodeExamplesSection } from "./ApiCodePanel";
import { ApiDocsCta } from "./ApiDocsCta";
import { ApiDocsHero } from "./ApiDocsHero";
import { ApiIdentifierFlow } from "./ApiIdentifierFlow";
import { ApiOverviewGrid } from "./ApiOverviewGrid";
import { API_NAV } from "./api-docs-shared";

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="api-editorial-doc-section scroll-mt-28">
      <h2 className="text-xl sm:text-2xl font-light text-[var(--platform-ink)] mb-4" style={SERIF}>
        {title}
      </h2>
      <div className="space-y-4 text-[15px] text-[var(--platform-muted)] leading-relaxed">{children}</div>
    </section>
  );
}

function EndpointCard({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  return (
    <div className="api-editorial-endpoint-card">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="api-editorial-access-method">{method}</span>
        <code className="text-xs break-all text-[var(--platform-ink)]">{path}</code>
      </div>
      <p className="text-sm leading-relaxed">{description}</p>
    </div>
  );
}

export function PlatformDocsClient() {
  const [active, setActive] = useState<string>(API_NAV[0].id);

  useEffect(() => {
    const nodes = API_NAV.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-18% 0px -55% 0px", threshold: [0, 0.2, 0.4, 0.6] }
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <ApiDocsHero />
      <ApiAccessCards />
      <ApiIdentifierFlow />

      <div className="api-editorial-docs">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20">
          <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14 xl:gap-20">
            <aside className="hidden lg:block">
              <nav aria-label="Documentation sections" className="sticky top-28">
                <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--platform-quiet)] mb-5">
                  API documentation
                </p>
                <ol className="space-y-1">
                  {API_NAV.map((item) => {
                    const selected = active === item.id;
                    return (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className={`api-editorial-nav-link ${selected ? "is-active" : ""}`}
                        >
                          {item.label}
                        </a>
                      </li>
                    );
                  })}
                </ol>
                <div className="api-editorial-nav-help">
                  <span className="api-editorial-nav-help-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M7 9h10M7 13h6" />
                      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 3V6a2 2 0 0 1 2-2Z" />
                    </svg>
                  </span>
                  <p className="text-sm text-[var(--platform-ink)] mb-2">Still have questions?</p>
                  <Link href="/platform/request?intent=api_access&cta=docs" className="api-editorial-access-link">
                    Discuss API access →
                  </Link>
                </div>
              </nav>
            </aside>

            <div className="min-w-0 space-y-12">
              <details className="lg:hidden mb-8 border border-[var(--platform-border)] bg-white rounded-xl p-4">
                <summary className="text-[11px] tracking-[0.14em] uppercase cursor-pointer text-[var(--platform-primary)]">
                  Jump to section
                </summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {API_NAV.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="text-[var(--platform-muted)] hover:text-[var(--platform-primary)]">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>

              <DocSection id="overview" title="Overview">
                <p>
                  The Material Intelligence API is one surface of the INTERTEXE product and material data layer. Send a
                  GTIN, UPC or EAN. Receive normalized fibre composition, evidence status and a DPP-readiness map that
                  can feed a PIM, PLM, ecommerce stack or INTERTEXE Digital Product Passport workflows. INTERTEXE is not
                  a legal-certification company and does not replace the EU DPP Registry.
                </p>
                <ApiOverviewGrid />
              </DocSection>

              <DocSection id="quickstart" title="Quickstart">
                <p>
                  Public demo below — no auth required. For production, add{" "}
                  <code className="api-editorial-inline-code">Authorization: Bearer itx_live_…</code> and use{" "}
                  <code className="api-editorial-inline-code">/api/v1/composition/{"{gtin}"}</code> instead of{" "}
                  <code className="api-editorial-inline-code">/api/v1/demo/composition/{"{gtin}"}</code>.
                </p>
                <ApiCodeExamplesSection mode="demo" />
              </DocSection>

              <DocSection id="authentication" title="Authentication">
                <p>
                  Production requires <code className="api-editorial-inline-code">Authorization: Bearer itx_live_…</code> or{" "}
                  <code className="api-editorial-inline-code">itx_test_</code>. Keys are hashed at rest, shown once, and
                  revocable by INTERTEXE. Never place keys in client-side JavaScript or query parameters.
                </p>
              </DocSection>

              <DocSection id="gtin" title="GTIN formats">
                <p>
                  GTIN-8, GTIN-12, GTIN-13 and GTIN-14. Leading zeroes are preserved. Invalid length, non-numeric values
                  or a failed check digit return HTTP 422.
                </p>
              </DocSection>

              <DocSection id="endpoints" title="Endpoints">
                <EndpointCard method="GET" path="/api/v1/composition/{gtin}" description="Authenticated production lookup." />
                <EndpointCard
                  method="GET"
                  path="/api/v1/demo/composition/{gtin}"
                  description="Allowlisted demonstration records only. Does not search the production catalog."
                />
                <p>Batch file ingestion is a managed pilot (CSV/JSON delivery), not a published async job endpoint.</p>
                <div className="overflow-x-auto rounded-xl border border-[var(--platform-border)] bg-white">
                  <table className="w-full min-w-[280px] text-left text-sm">
                    <thead className="bg-[#faf8f5] text-[var(--platform-quiet)] uppercase tracking-[0.08em] text-xs">
                      <tr>
                        <th className="px-4 py-3 font-normal">GTIN</th>
                        <th className="px-4 py-3 font-normal">Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-[var(--platform-border)]">
                        <td className="px-4 py-3 font-mono text-xs">{DEMO_GTIN_VERIFIED}</td>
                        <td className="px-4 py-3">Illustrative verified-label example</td>
                      </tr>
                      <tr className="border-t border-[var(--platform-border)]">
                        <td className="px-4 py-3 font-mono text-xs">{DEMO_GTIN_REPORTED}</td>
                        <td className="px-4 py-3">Reported retailer/feed example</td>
                      </tr>
                      <tr className="border-t border-[var(--platform-border)]">
                        <td className="px-4 py-3 font-mono text-xs">{DEMO_GTIN_MISSING}</td>
                        <td className="px-4 py-3">Valid GTIN, no composition, no invented manufacturer</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </DocSection>

              <DocSection id="match-types" title="Match types">
                <p>
                  exact_gtin, exact_sku, exact_product_url, manufacturer_only, not_found. manufacturer_only and
                  not_found always return an empty composition array.
                </p>
              </DocSection>

              <DocSection id="evidence" title="Evidence statuses">
                <ul className="list-disc pl-5 space-y-2">
                  <li>verified_label — physical label that passed the review protocol. Not certification.</li>
                  <li>reported_brand / reported_retailer — attributed claims.</li>
                  <li>inferred — never returned as verified fact.</li>
                  <li>unknown_legacy — historical row without reliable lineage. Default for older scans.</li>
                  <li>missing — no product-level composition.</li>
                </ul>
              </DocSection>

              <DocSection id="product-identity" title="Product identity and public resolution">
                <p>
                  INTERTEXE manages the digital infrastructure behind product identity and hosted passports. Customers
                  buy managed product identity and passport infrastructure — not underlying hosting vendors.
                </p>
                <p>The conceptual flow for published passports:</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <strong className="font-medium text-[var(--platform-ink)]">Product</strong> — governed enterprise
                    product record (materials, provenance, approval state).
                  </li>
                  <li>
                    <strong className="font-medium text-[var(--platform-ink)]">Public identity</strong> — a stable{" "}
                    <code className="api-editorial-inline-code">public_id</code> assigned when a passport is created.
                  </li>
                  <li>
                    <strong className="font-medium text-[var(--platform-ink)]">Data carrier</strong> — QR is the primary
                    V1 carrier. NFC and RFID are compatible extensions.
                  </li>
                  <li>
                    <strong className="font-medium text-[var(--platform-ink)]">Resolver</strong> —{" "}
                    <code className="api-editorial-inline-code">https://www.intertexe.com/p/{"{public_id}"}</code> serves
                    the current published passport snapshot.
                  </li>
                  <li>
                    <strong className="font-medium text-[var(--platform-ink)]">Published version</strong> — immutable
                    passport version snapshots.
                  </li>
                </ol>
              </DocSection>

              <DocSection id="dpp" title="DPP alignment">
                <p>{DPP_ALIGNMENT_NOTICE}</p>
              </DocSection>

              <DocSection id="errors" title="Errors">
                <div className="overflow-x-auto rounded-xl border border-[var(--platform-border)] bg-white mb-3">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead className="bg-[#faf8f5] text-[var(--platform-quiet)] uppercase tracking-[0.08em] text-xs">
                      <tr>
                        <th className="px-4 py-3 font-normal text-left">Code</th>
                        <th className="px-4 py-3 font-normal text-left">Meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["401", "Missing, invalid or revoked key"],
                        ["403", "Inactive or expired key"],
                        ["422", "Invalid GTIN"],
                        ["429", "Rate limit exceeded"],
                      ].map(([code, meaning]) => (
                        <tr key={code} className="border-t border-[var(--platform-border)]">
                          <td className="px-4 py-3 font-mono text-xs">{code}</td>
                          <td className="px-4 py-3">{meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  Body is always {"{ api_version, request_id, error: { code, message } }"} with X-Request-ID. Stack
                  traces are not returned.
                </p>
              </DocSection>

              <DocSection id="schema" title="Response schema">
                <p>
                  Success: <code className="api-editorial-inline-code">{"{ api_version, request_id, data }"}</code> with
                  product, composition, evidence and dpp_alignment. The published OpenAPI 3.1 document at{" "}
                  <a href="/api/openapi.json" className="api-editorial-access-link">
                    /api/openapi.json
                  </a>{" "}
                  is the runtime contract.
                </p>
              </DocSection>

              <DocSection id="rate-limits" title="Rate limits">
                <p>
                  Demo: 40 requests / 10 minutes / IP. Production: per-key per-minute and monthly limits from the client
                  plan (onboarding fee default 60/min, 5,000/month). Production CORS is limited to
                  https://www.intertexe.com.
                </p>
              </DocSection>

              <DocSection id="freshness" title="Data freshness and versioning">
                <p>
                  api_version is v1. Records reflect the latest stored composition and evidence timestamps. Historical
                  rows without lineage stay unknown_legacy until reviewed. INTERTEXE does not invent percentages to
                  force a 100% total.
                </p>
              </DocSection>

              <DocSection id="support" title="Support">
                <p>
                  Early access:{" "}
                  <Link href="/platform/request?intent=api_access&cta=docs" className="api-editorial-access-link">
                    Discuss API access
                  </Link>{" "}
                  or info@intertexe.com.
                </p>
              </DocSection>
            </div>
          </div>
        </div>
      </div>

      <ApiDocsCta />
    </>
  );
}
