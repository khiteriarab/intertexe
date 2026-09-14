"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { lookupDemoRecord } from "../../../lib/material-intelligence/demo-records";
import { demoCurl, jsExample, pythonExample, SAMPLE_GTINS } from "./api-docs-shared";
import { SERIF } from "../platform-ui";

type CodeTab = "curl" | "javascript" | "python";

function Barcode({ gtin }: { gtin: string }) {
  let x = 0;
  const bars = gtin.split("").map((ch, i) => {
    const w = (ch.charCodeAt(0) % 3) + 1;
    const rect = <rect key={i} x={x} y={0} width={w} height={32} fill="currentColor" />;
    x += w + 1;
    return rect;
  });
  return (
    <svg viewBox={`0 0 ${Math.max(x, 48)} 32`} className="api-hero-barcode-svg" aria-hidden>
      {bars}
    </svg>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`api-hero-status ${ok ? "is-ok" : ""}`}>
      {ok ? "✓" : "—"} {label}
    </span>
  );
}

export function ApiDocsHeroVisual() {
  const [tab, setTab] = useState<CodeTab>("curl");
  const sample = lookupDemoRecord(SAMPLE_GTINS.verified);
  const gtin = sample?.product.gtin ?? SAMPLE_GTINS.verified;
  const productName = sample?.product.name ?? "Product";
  const brand = sample?.product.brand ?? "INTERTEXE Sample";
  const composition = sample?.composition.components
    .map((c) => `${c.percentage}% ${c.fiber_name}`)
    .join(" · ") ?? "—";
  const evidence = sample?.evidence.status?.replace(/_/g, " ") ?? "unknown";
  const dppStatus = sample?.dpp_alignment.status ?? "insufficient";
  const dppReady = dppStatus === "mapped";

  const code =
    tab === "curl" ? demoCurl(gtin) : tab === "javascript" ? jsExample(gtin) : pythonExample(gtin);

  return (
    <div className="api-editorial-hero-composite" aria-label="Material Intelligence API in action">
      <div className="api-editorial-hero-composite-bg">
        <Image src="/fabrics/fabric-wool.jpg" alt="" fill className="object-cover" sizes="640px" unoptimized />
      </div>

      <p className="api-editorial-hero-edge-label" aria-hidden>
        Material intelligence for a more transparent tomorrow
      </p>

      <div className="api-hero-gtin-card">
        <p className="api-hero-card-eyebrow">GTIN</p>
        <Barcode gtin={gtin} />
        <p className="api-hero-gtin-value">{gtin}</p>
      </div>

      <div className="api-hero-code-card">
        <div className="api-hero-code-tabs" role="tablist">
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
              className={tab === id ? "is-active" : undefined}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <pre className="api-hero-code-pre">
          <code>{code}</code>
        </pre>
      </div>

      <article className="api-hero-product-card">
        <div className="api-hero-product-image">
          <Image
            src="/platform/hero-silk-dress.png"
            alt={productName}
            fill
            className="object-cover"
            sizes="120px"
            unoptimized
          />
        </div>
        <div className="api-hero-product-body">
          <p className="api-hero-card-eyebrow">{brand}</p>
          <h3 className="api-hero-product-name" style={SERIF}>
            {productName}
          </h3>
          <dl className="api-hero-product-meta">
            <div>
              <dt>GTIN</dt>
              <dd>{gtin}</dd>
            </div>
            <div>
              <dt>Composition</dt>
              <dd>{composition}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>
                <StatusPill ok={sample?.evidence.status === "verified_label"} label={evidence} />
              </dd>
            </div>
            <div>
              <dt>DPP readiness</dt>
              <dd>
                <StatusPill ok={dppReady} label={dppStatus === "mapped" ? "Ready" : dppStatus === "partial" ? "Partial" : "Insufficient"} />
              </dd>
            </div>
          </dl>
          <Link href="/p/itx_4p2h31174z5e4f6n6f1a" className="api-hero-passport-link">
            View full product passport →
          </Link>
        </div>
      </article>
    </div>
  );
}
