"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PlatformPageHeader } from "../PlatformPageHeader";
import { PlatformDocsOverview } from "./PlatformDocsOverview";
import {
  DEMO_GTIN_MISSING,
  DEMO_GTIN_REPORTED,
  DEMO_GTIN_VERIFIED,
} from "../../../lib/material-intelligence/demo-records";
import { DPP_ALIGNMENT_NOTICE } from "../../../lib/material-intelligence/types";

const NAV = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quickstart" },
  { id: "authentication", label: "Authentication" },
  { id: "gtin", label: "GTIN formats" },
  { id: "endpoints", label: "Endpoints" },
  { id: "match-types", label: "Match types" },
  { id: "evidence", label: "Evidence statuses" },
  { id: "product-identity", label: "Product identity" },
  { id: "dpp", label: "DPP alignment" },
  { id: "errors", label: "Errors" },
  { id: "schema", label: "Response schema" },
  { id: "rate-limits", label: "Rate limits" },
  { id: "freshness", label: "Data freshness" },
  { id: "examples", label: "Code examples" },
  { id: "support", label: "Support" },
] as const;

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [code]);

  return (
    <div className="relative group mb-4 max-w-full">
      {label ? (
        <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-2">{label}</p>
      ) : null}
      <pre className="bg-[#faf8f5] lg:bg-[#152238] lg:text-[#e8eef4] border border-[#ddd5cb] lg:border-[#152238] p-3 sm:p-4 lg:p-5 text-[11px] sm:text-xs overflow-x-auto rounded-lg pr-14">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute top-8 sm:top-9 right-2 text-[10px] tracking-[0.1em] uppercase border border-[#ddd5cb] bg-white px-2.5 py-1.5 min-h-[32px] hover:border-[#152238]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#152238]/40"
        aria-label={copied ? "Copied" : "Copy code"}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

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
    <section id={id} className="scroll-mt-28 border-t border-[#e8e3da] pt-10 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-light text-[#1a1a1a] mb-3" style={{ fontFamily: "Georgia, serif" }}>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
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
    <div className="border border-[#e8e3da] bg-white rounded-lg p-4 sm:p-5 mb-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-[10px] tracking-[0.12em] uppercase bg-[#152238] text-white px-2 py-1">{method}</span>
        <code className="text-xs break-all">{path}</code>
      </div>
      <p className="text-sm text-[#5c5854] leading-relaxed">{description}</p>
    </div>
  );
}

export function PlatformDocsClient() {
  const [active, setActive] = useState<string>(NAV[0].id);

  useEffect(() => {
    const nodes = NAV.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const demoCurl = `curl -sS https://www.intertexe.com/api/v1/demo/composition/${DEMO_GTIN_VERIFIED}`;
  const prodCurl = `curl -sS https://www.intertexe.com/api/v1/composition/${DEMO_GTIN_VERIFIED} \\
  -H "Authorization: Bearer itx_live_…"`;

  return (
    <>
      <PlatformPageHeader
        eyebrow="API reference"
        title="Material Intelligence API"
        description="Full reference for developers — authentication, GTIN validation, evidence statuses, and DPP-readiness. Try the live lookup on the demo page first."
        primaryHref="/platform/demo#api"
        primaryLabel="Try live demo"
        secondaryHref="/platform/request?intent=api_access&cta=docs"
        secondaryLabel="Discuss API access"
      />
      <PlatformDocsOverview />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20">
        <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14 xl:gap-20">
        <aside className="hidden lg:block">
          <nav aria-label="Documentation sections" className="sticky top-24">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#9c7b8b] mb-4">On this page</p>
            <ul className="space-y-1 text-sm">
              {NAV.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={`block py-1.5 pl-3 border-l-2 transition-colors ${
                      active === item.id
                        ? "border-[#152238] text-[#152238]"
                        : "border-transparent text-[#8a847c] hover:text-[#152238]"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 text-sm text-[#5c5854] leading-relaxed">
          <details className="lg:hidden mb-8 border border-[#e8e3da] bg-white rounded-lg p-4">
            <summary className="text-[11px] tracking-[0.14em] uppercase cursor-pointer text-[#152238]">
              Jump to section
            </summary>
            <ul className="mt-3 space-y-2 text-sm">
              {NAV.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-[#5c5854] hover:text-[#152238]">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>

          <DocSection id="overview" title="What the API does">
            <p>
              The Material Intelligence API is one surface of the INTERTEXE product and material data layer. Send a
              GTIN, UPC or EAN. Receive normalized fibre composition, evidence status and a DPP-readiness map that can
              feed a PIM, PLM, ecommerce stack or INTERTEXE Digital Product Passport workflows. INTERTEXE is not a
              legal-certification company and does not replace the EU DPP Registry.
            </p>
            <p>
              <a href="/api/openapi.json" className="underline underline-offset-4 text-[#1a1a1a]">
                Download OpenAPI 3.1
              </a>
              {" · "}
              <Link href="/platform/demo" className="underline underline-offset-4 text-[#1a1a1a]">
                Public demo
              </Link>
            </p>
          </DocSection>

          <DocSection id="quickstart" title="Quickstart">
            <CodeBlock code={demoCurl} label="Demo (no auth)" />
            <CodeBlock code={prodCurl} label="Production (authenticated)" />
          </DocSection>

          <DocSection id="authentication" title="Authentication">
            <p>
              Production requires <code className="text-xs">Authorization: Bearer itx_live_…</code> or{" "}
              <code className="text-xs">itx_test_</code>. Keys are hashed at rest, shown once, and revocable by
              INTERTEXE. Never place keys in client-side JavaScript or query parameters.
            </p>
          </DocSection>

          <DocSection id="gtin" title="GTIN formats">
            <p>
              GTIN-8, GTIN-12, GTIN-13 and GTIN-14. Leading zeroes are preserved. Invalid length, non-numeric values or
              a failed check digit return HTTP 422.
            </p>
          </DocSection>

          <DocSection id="endpoints" title="Endpoints">
            <EndpointCard
              method="GET"
              path="/api/v1/composition/{gtin}"
              description="Authenticated production lookup."
            />
            <EndpointCard
              method="GET"
              path="/api/v1/demo/composition/{gtin}"
              description="Allowlisted demonstration records only. Does not search the production catalog."
            />
            <p>Batch file ingestion is a managed pilot (CSV/JSON delivery), not a published async job endpoint.</p>
            <div className="overflow-x-auto rounded-lg border border-[#e8e3da]">
              <table className="w-full min-w-[280px] text-left text-xs">
                <thead className="bg-[#faf8f5] text-[#8a847c] uppercase tracking-[0.08em]">
                  <tr>
                    <th className="px-4 py-3 font-normal">GTIN</th>
                    <th className="px-4 py-3 font-normal">Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#eeeae4]">
                    <td className="px-4 py-3 font-mono">{DEMO_GTIN_VERIFIED}</td>
                    <td className="px-4 py-3">Illustrative verified-label example</td>
                  </tr>
                  <tr className="border-t border-[#eeeae4]">
                    <td className="px-4 py-3 font-mono">{DEMO_GTIN_REPORTED}</td>
                    <td className="px-4 py-3">Reported retailer/feed example</td>
                  </tr>
                  <tr className="border-t border-[#eeeae4]">
                    <td className="px-4 py-3 font-mono">{DEMO_GTIN_MISSING}</td>
                    <td className="px-4 py-3">Valid GTIN, no composition, no invented manufacturer</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </DocSection>

          <DocSection id="match-types" title="Match types">
            <p>
              exact_gtin, exact_sku, exact_product_url, manufacturer_only, not_found. manufacturer_only and not_found
              always return an empty composition array.
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
              INTERTEXE manages the digital infrastructure behind product identity and hosted passports. Customers buy
              managed product identity and passport infrastructure — not underlying hosting vendors.
            </p>
            <p>The conceptual flow for published passports:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong className="font-medium text-[#161513]">Product</strong> — governed enterprise product record
                (materials, provenance, approval state).
              </li>
              <li>
                <strong className="font-medium text-[#161513]">Public identity</strong> — a stable{" "}
                <code className="text-xs">public_id</code> assigned when a passport is created. The identity persists
                across passport versions.
              </li>
              <li>
                <strong className="font-medium text-[#161513]">Data carrier</strong> — the physical or digital link to
                that identity. QR is the primary V1 carrier. NFC and RFID are compatible extensions; physical encoding is
                typically handled by a brand&apos;s label supplier — INTERTEXE does not manufacture hardware.
              </li>
              <li>
                <strong className="font-medium text-[#161513]">Resolver</strong> —{" "}
                <code className="text-xs">https://www.intertexe.com/p/{"{public_id}"}</code> serves the current published
                passport snapshot. A JSON view is available at{" "}
                <code className="text-xs">/p/{"{public_id}"}/json</code>.
              </li>
              <li>
                <strong className="font-medium text-[#161513]">Published version</strong> — immutable passport version
                snapshots. New versions can be published without changing the underlying public identity.
              </li>
            </ol>
            <p>
              The Material Intelligence API returns composition and readiness signals that feed passport workflows. It
              does not replace passport creation, carrier management, or the public resolver — those are enterprise
              workspace capabilities.
            </p>
          </DocSection>

          <DocSection id="dpp" title="DPP alignment">
            <p>{DPP_ALIGNMENT_NOTICE}</p>
          </DocSection>

          <DocSection id="errors" title="Errors">
            <div className="overflow-x-auto rounded-lg border border-[#e8e3da] mb-3">
              <table className="w-full min-w-[320px] text-xs">
                <thead className="bg-[#faf8f5] text-[#8a847c] uppercase tracking-[0.08em]">
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
                    <tr key={code} className="border-t border-[#eeeae4]">
                      <td className="px-4 py-3 font-mono">{code}</td>
                      <td className="px-4 py-3">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Body is always {"{ api_version, request_id, error: { code, message } }"} with X-Request-ID. Stack traces
              are not returned.
            </p>
          </DocSection>

          <DocSection id="schema" title="Response schema">
            <p>
              Success: <code className="text-xs">{"{ api_version, request_id, data }"}</code> with product, composition,
              evidence and dpp_alignment. The published OpenAPI 3.1 document at{" "}
              <a href="/api/openapi.json" className="underline">
                /api/openapi.json
              </a>{" "}
              is the runtime contract.
            </p>
          </DocSection>

          <DocSection id="rate-limits" title="Rate limits">
            <p>
              Demo: 40 requests / 10 minutes / IP. Production: per-key per-minute and monthly limits from the client
              plan (founding pilot default 60/min, 5,000/month). Production CORS is limited to https://www.intertexe.com.
            </p>
          </DocSection>

          <DocSection id="freshness" title="Data freshness and versioning">
            <p>
              api_version is v1. Records reflect the latest stored composition and evidence timestamps. Historical rows
              without lineage stay unknown_legacy until reviewed. INTERTEXE does not invent percentages to force a 100%
              total.
            </p>
          </DocSection>

          <DocSection id="examples" title="Code examples">
            <CodeBlock
              label="cURL"
              code={`curl -sS https://www.intertexe.com/api/v1/demo/composition/${DEMO_GTIN_VERIFIED}
curl -sS https://www.intertexe.com/api/v1/composition/${DEMO_GTIN_VERIFIED} \\
  -H "Authorization: Bearer itx_live_YOUR_KEY"`}
            />
            <CodeBlock
              label="JavaScript"
              code={`const res = await fetch(
  "https://www.intertexe.com/api/v1/demo/composition/${DEMO_GTIN_VERIFIED}"
);
const json = await res.json();`}
            />
            <CodeBlock
              label="Python"
              code={`import urllib.request, json
url = "https://www.intertexe.com/api/v1/demo/composition/${DEMO_GTIN_VERIFIED}"
print(json.load(urllib.request.urlopen(url)))`}
            />
          </DocSection>

          <DocSection id="support" title="Support">
            <p>
              Early access:{" "}
              <Link href="/platform/request?intent=api_access&cta=docs" className="underline text-[#1a1a1a]">
                Discuss API access
              </Link>{" "}
              or info@intertexe.com.
            </p>
          </DocSection>
        </div>
        </div>
      </div>
    </>
  );
}
