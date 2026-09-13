import {
  DEMO_GTIN_MISSING,
  DEMO_GTIN_REPORTED,
  DEMO_GTIN_VERIFIED,
} from "../../../lib/material-intelligence/demo-records";

export const API_NAV = [
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

export type ApiNavId = (typeof API_NAV)[number]["id"];

export const API_OVERVIEW_CARDS = [
  { id: "authentication", title: "Authentication", copy: "Bearer tokens for production — hashed at rest, revocable." },
  { id: "gtin", title: "GTIN formats", copy: "GTIN-8/12/13/14 with check-digit validation." },
  { id: "endpoints", title: "Endpoints", copy: "Demo and production composition lookups." },
  { id: "evidence", title: "Evidence statuses", copy: "verified_label through missing — never inferred as fact." },
  { id: "product-identity", title: "Product identity", copy: "Public IDs, carriers, and passport resolver flow." },
  { id: "dpp", title: "DPP alignment", copy: "Field completeness map — preparation, not certification." },
  { id: "errors", title: "Errors", copy: "Structured envelope with request_id — no stack traces." },
  { id: "schema", title: "Response schema", copy: "product · composition · evidence · dpp_alignment." },
  { id: "freshness", title: "Data freshness", copy: "api_version v1 · latest stored composition timestamps." },
] as const;

export const API_FLOW_STEPS = [
  { num: "1", label: "Send GTIN", detail: "GTIN, UPC, or EAN identifier" },
  { num: "2", label: "Resolve product identity", detail: "Match type and product record" },
  { num: "3", label: "Normalize composition", detail: "Fiber codes and percentages" },
  { num: "4", label: "Attach evidence status", detail: "Label, feed, or missing lineage" },
  { num: "5", label: "Return DPP-readiness", detail: "Available and missing fields" },
] as const;

export function demoCurl(gtin = DEMO_GTIN_VERIFIED) {
  return `curl -sS https://www.intertexe.com/api/v1/demo/composition/${gtin}`;
}

export function prodCurl(gtin = DEMO_GTIN_VERIFIED) {
  return `curl -sS https://www.intertexe.com/api/v1/composition/${gtin} \\
  -H "Authorization: Bearer itx_live_…"`;
}

export function jsExample(gtin = DEMO_GTIN_VERIFIED) {
  return `const res = await fetch(
  "https://www.intertexe.com/api/v1/demo/composition/${gtin}"
);
const json = await res.json();`;
}

export function pythonExample(gtin = DEMO_GTIN_VERIFIED) {
  return `import urllib.request, json
url = "https://www.intertexe.com/api/v1/demo/composition/${gtin}"
print(json.load(urllib.request.urlopen(url)))`;
}

export const SAMPLE_GTINS = {
  verified: DEMO_GTIN_VERIFIED,
  reported: DEMO_GTIN_REPORTED,
  missing: DEMO_GTIN_MISSING,
} as const;
