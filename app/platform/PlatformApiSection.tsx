"use client";

import Link from "next/link";
import { useState } from "react";
import { DEMO_GTIN_VERIFIED, lookupDemoRecord } from "../../lib/material-intelligence/demo-records";
import { demoCurl, jsExample, prodCurl, pythonExample } from "./api-snippets";
import { SERIF } from "./platform-ui";

type CodeTab = "curl" | "javascript" | "python" | "production";

const TABS: { id: CodeTab; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "production", label: "Production" },
];

const REFERENCE = [
  {
    term: "Authentication",
    detail: "Production requires Authorization: Bearer itx_live_… — keys hashed at rest, shown once, revocable.",
  },
  {
    term: "Endpoints",
    detail: "/api/v1/composition/{gtin} for production, /api/v1/demo/composition/{gtin} for allowlisted samples.",
  },
  {
    term: "Identifiers",
    detail: "GTIN-8/12/13/14 with leading zeroes preserved. Failed check digit returns HTTP 422.",
  },
  {
    term: "Evidence statuses",
    detail: "verified_label · reported_brand · reported_retailer · inferred · unknown_legacy · missing.",
  },
  {
    term: "Errors",
    detail: "401 invalid key · 403 inactive key · 422 invalid GTIN · 429 rate limited, each with a request_id.",
  },
  {
    term: "Rate limits",
    detail: "Demo 40 requests / 10 minutes / IP. Production limits follow the client plan.",
  },
];

function codeFor(tab: CodeTab) {
  if (tab === "curl") return demoCurl();
  if (tab === "production") return prodCurl();
  if (tab === "javascript") return jsExample();
  return pythonExample();
}

export function PlatformApiSection() {
  const [tab, setTab] = useState<CodeTab>("curl");
  const sample = lookupDemoRecord(DEMO_GTIN_VERIFIED);

  const responsePreview = sample
    ? JSON.stringify(
        {
          api_version: "v1",
          request_id: "req_sample",
          data: {
            product: sample.product,
            composition: sample.composition,
            evidence: { status: sample.evidence.status },
            dpp_alignment: { status: sample.dpp_alignment.status },
          },
        },
        null,
        2,
      )
    : "";

  return (
    <section id="api" className="scroll-mt-28 platform-api-section">
      <div className="platform-lux-wrap">
        <div className="platform-api-head">
          <p className="platform-api-kicker">Material Intelligence API</p>
          <h2 className="platform-api-title" style={SERIF}>
            Built to become infrastructure.
          </h2>
          <p className="platform-api-copy">
            Push and retrieve governed product information through INTERTEXE&apos;s API. Send a GTIN, receive normalized
            fibre composition, evidence status and a DPP-readiness map for your own systems.
          </p>
        </div>

        <div className="platform-api-stage">
          <div className="platform-api-panel">
            <div className="platform-api-panel-head">
              <div className="platform-api-tabs" role="tablist" aria-label="API examples">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.id}
                    className={`platform-api-tab ${tab === item.id ? "is-active" : ""}`}
                    onClick={() => setTab(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <pre className="platform-api-code">
              <code>{codeFor(tab)}</code>
            </pre>
            <p className="platform-api-response-label">Example response (truncated)</p>
            <pre className="platform-api-response">{responsePreview}</pre>
          </div>

          {sample ? (
            <aside className="platform-api-product" aria-label="Product behind the response">
              <p className="platform-api-product-kicker">The product behind the payload</p>
              <p className="platform-api-product-name" style={SERIF}>
                {sample.product.name}
              </p>
              <p className="platform-api-product-brand">{sample.product.brand}</p>
              <dl className="platform-api-product-rows">
                {sample.composition.components.map((component) => (
                  <div key={component.fiber_code}>
                    <dt>{component.fiber_name}</dt>
                    <dd>{component.percentage}%</dd>
                  </div>
                ))}
                <div>
                  <dt>Evidence</dt>
                  <dd>{sample.evidence.status}</dd>
                </div>
                <div>
                  <dt>GTIN</dt>
                  <dd>{sample.product.gtin}</dd>
                </div>
              </dl>
              <p className="platform-api-product-note">{sample.message}</p>
            </aside>
          ) : null}
        </div>

        <dl className="platform-api-reference">
          {REFERENCE.map((item) => (
            <div key={item.term}>
              <dt>{item.term}</dt>
              <dd>{item.detail}</dd>
            </div>
          ))}
        </dl>

        <div className="platform-api-actions">
          <Link href="/platform/request?intent=api_access&cta=platform_api" className="platform-api-cta">
            Discuss API access
            <span aria-hidden>→</span>
          </Link>
          <a href="/api/openapi.json" className="platform-api-link">
            OpenAPI 3.1 contract
          </a>
          <Link href="/platform/demo#api" className="platform-api-link">
            Try it on the live demo
          </Link>
        </div>
      </div>
    </section>
  );
}
