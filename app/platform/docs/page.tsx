import type { Metadata } from "next";
import Link from "next/link";
import {
  DEMO_GTIN_MISSING,
  DEMO_GTIN_REPORTED,
  DEMO_GTIN_VERIFIED,
} from "../../../lib/material-intelligence/demo-records";
import { DPP_ALIGNMENT_NOTICE } from "../../../lib/material-intelligence/types";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";

export const metadata: Metadata = {
  title: "Material Intelligence API documentation",
  description:
    "Authentication, GTIN validation, evidence statuses, errors, rate limits and DPP-readiness limitations for the INTERTEXE Material Intelligence API.",
};

export default function PlatformDocsPage() {
  return (
    <PlatformChrome active="docs">
      <PlatformViewTracker event="platform_docs_view" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24 text-sm text-[#5c5854] leading-relaxed break-words min-w-0">
        <p className="text-[10px] sm:text-[11px] tracking-[0.16em] sm:tracking-[0.25em] text-[#9c7b8b] mb-6">DOCUMENTATION</p>
        <h1 className="text-[1.75rem] sm:text-4xl font-light text-[#1a1a1a] mb-6" style={{ fontFamily: "Georgia, serif" }}>
          INTERTEXE Material Intelligence API
        </h1>
        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mb-3" style={{ fontFamily: "Georgia, serif" }}>
          What the API does
        </h2>
        <p className="mb-4">
          Send a GTIN, UPC or EAN. Receive normalized fibre composition, evidence status and a DPP-readiness
          map that can feed a PIM, PLM, ecommerce stack or INTERTEXE Digital Product Passport workflows.
          INTERTEXE is not a legal-certification company and does not replace the EU DPP Registry.
        </p>
        <p className="mb-10">
          <a href="/api/openapi.json" className="underline underline-offset-4 text-[#1a1a1a]">
            Download OpenAPI 3.1
          </a>
          {" · "}
          <Link href="/platform/demo" className="underline underline-offset-4 text-[#1a1a1a]">
            Public demo
          </Link>
        </p>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>Quickstart</h2>
        <pre className="bg-white border border-[#ddd5cb] p-3 sm:p-4 text-[11px] sm:text-xs overflow-x-auto mb-4 max-w-full whitespace-pre-wrap sm:whitespace-pre break-all sm:break-normal">{`curl -sS https://www.intertexe.com/api/v1/demo/composition/${DEMO_GTIN_VERIFIED}`}</pre>
        <p>Production (authenticated):</p>
        <pre className="bg-white border border-[#ddd5cb] p-3 sm:p-4 text-[11px] sm:text-xs overflow-x-auto max-w-full whitespace-pre-wrap sm:whitespace-pre break-all sm:break-normal">{`curl -sS https://www.intertexe.com/api/v1/composition/${DEMO_GTIN_VERIFIED} \\
  -H "Authorization: Bearer itx_live_…"`}</pre>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>Authentication</h2>
        <p>
          Production requires <code className="text-xs">Authorization: Bearer itx_live_…</code> or{" "}
          <code className="text-xs">itx_test_</code>. Keys are hashed at rest, shown once, and revocable by
          INTERTEXE. Never place keys in client-side JavaScript or query parameters.
        </p>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>GTIN formats</h2>
        <p>
          GTIN-8, GTIN-12, GTIN-13 and GTIN-14. Leading zeroes are preserved. Invalid length, non-numeric
          values or a failed check digit return HTTP 422.
        </p>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>Endpoints</h2>
        <p>
          <code className="text-xs">GET /api/v1/composition/{"{gtin}"}</code> — authenticated production lookup.
        </p>
        <p>
          <code className="text-xs">GET /api/v1/demo/composition/{"{gtin}"}</code> — allowlisted demonstration
          records only. It does not search the production catalog.
        </p>
        <p>
          Batch file ingestion is a managed pilot (CSV/JSON delivery), not a published async job endpoint.
        </p>
        <p className="mt-3">Demonstration identifiers:</p>
        <ul className="list-disc pl-5">
          <li>
            {DEMO_GTIN_VERIFIED} — illustrative verified-label example
          </li>
          <li>{DEMO_GTIN_REPORTED} — reported retailer/feed example</li>
          <li>{DEMO_GTIN_MISSING} — valid GTIN, no composition, no invented manufacturer</li>
        </ul>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>Match types</h2>
        <p>exact_gtin, exact_sku, exact_product_url, manufacturer_only, not_found. manufacturer_only and not_found always return an empty composition array.</p>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>Evidence statuses</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>verified_label — physical label that passed the review protocol. Not certification.</li>
          <li>reported_brand / reported_retailer — attributed claims.</li>
          <li>inferred — never returned as verified fact.</li>
          <li>unknown_legacy — historical row without reliable lineage. Default for older scans.</li>
          <li>missing — no product-level composition.</li>
        </ul>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>DPP alignment</h2>
        <p>{DPP_ALIGNMENT_NOTICE}</p>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>Errors</h2>
        <p>401 missing, invalid or revoked key · 403 inactive/expired · 422 invalid GTIN · 429 rate limit. Body is always {"{ api_version, request_id, error: { code, message } }"} with X-Request-ID. Stack traces are not returned.</p>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>Response schema</h2>
        <p>
          Success: <code className="text-xs">{"{ api_version, request_id, data }"}</code> with product, composition,
          evidence and dpp_alignment. The published OpenAPI 3.1 document at{" "}
          <a href="/api/openapi.json" className="underline">
            /api/openapi.json
          </a>{" "}
          is the runtime contract. Demo and production share the same envelope.
        </p>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>Rate limits</h2>
        <p>Demo: 40 requests / 10 minutes / IP. Production: per-key per-minute and monthly limits from the client plan (founding pilot default 60/min, 5,000/month). Production CORS is limited to https://www.intertexe.com; server-to-server clients do not need CORS.</p>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>Data freshness and versioning</h2>
        <p>
          api_version is v1. Records reflect the latest stored composition and evidence timestamps. Historical
          rows without lineage stay unknown_legacy until reviewed. INTERTEXE does not invent percentages to
          force a 100% total.
        </p>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>cURL</h2>
        <pre className="bg-white border border-[#ddd5cb] p-3 sm:p-4 text-[11px] sm:text-xs overflow-x-auto max-w-full whitespace-pre-wrap sm:whitespace-pre break-all sm:break-normal">{`curl -sS https://www.intertexe.com/api/v1/demo/composition/${DEMO_GTIN_VERIFIED}
curl -sS https://www.intertexe.com/api/v1/composition/${DEMO_GTIN_VERIFIED} \\
  -H "Authorization: Bearer itx_live_YOUR_KEY"`}</pre>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>JavaScript</h2>
        <pre className="bg-white border border-[#ddd5cb] p-3 sm:p-4 text-[11px] sm:text-xs overflow-x-auto max-w-full whitespace-pre-wrap sm:whitespace-pre break-all sm:break-normal">{`const res = await fetch(
  "https://www.intertexe.com/api/v1/demo/composition/${DEMO_GTIN_VERIFIED}"
);
const json = await res.json();`}</pre>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>Python</h2>
        <pre className="bg-white border border-[#ddd5cb] p-3 sm:p-4 text-[11px] sm:text-xs overflow-x-auto max-w-full whitespace-pre-wrap sm:whitespace-pre break-all sm:break-normal">{`import urllib.request, json
url = "https://www.intertexe.com/api/v1/demo/composition/${DEMO_GTIN_VERIFIED}"
print(json.load(urllib.request.urlopen(url)))`}</pre>

        <h2 className="text-xl sm:text-2xl font-light text-[#1a1a1a] mt-12 mb-3" style={{ fontFamily: "Georgia, serif" }}>Support</h2>
        <p>
          Early access:{" "}
          <Link href="/platform/request?intent=api_access&cta=docs" className="underline text-[#1a1a1a]">
            Discuss API access
          </Link>{" "}
          or info@intertexe.com.
        </p>
      </div>
    </PlatformChrome>
  );
}
