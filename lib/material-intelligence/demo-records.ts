import { parseGtin } from "../gtin";
import { dppAlignmentFor, EMPTY_COMPOSITION } from "./envelope";
import type { MaterialLookupData } from "./types";

/** Checksum-valid demonstration identifiers. Not production catalog GTINs. */
export const DEMO_GTIN_VERIFIED = "0123456789012";
export const DEMO_GTIN_REPORTED = "0200000000011";
export const DEMO_GTIN_MISSING = "0200000000028";

export const DEMO_ILLUSTRATIVE_NOTICE =
  "Illustrative verified-label example. This fixture is not backed by a production review record.";

const ILLUSTRATIVE_BRAND = "INTERTEXE Sample";

function verifiedSample(): MaterialLookupData {
  return {
    match_status: "matched",
    match_type: "exact_gtin",
    product: {
      gtin: DEMO_GTIN_VERIFIED,
      brand: ILLUSTRATIVE_BRAND,
      name: "Silk Midi Skirt",
      sku: "SAMPLE-VERIFIED",
    },
    composition: {
      components: [
        { fiber_code: "silk", fiber_name: "Silk", percentage: 96, raw_value: "96% silk" },
        { fiber_code: "elastane", fiber_name: "Elastane", percentage: 4, raw_value: "4% elastane" },
      ],
      primary_fiber: "silk",
      natural_fiber_percentage: 96,
      total_percentage: 100,
      normalization_warnings: [],
    },
    evidence: {
      status: "verified_label",
      sources: [
        {
          type: "physical_label_scan",
          captured_at: "2026-08-18T12:00:00Z",
          reviewed_at: "2026-08-18T12:00:00Z",
        },
      ],
      last_updated: "2026-08-18T12:00:00Z",
    },
    dpp_alignment: dppAlignmentFor({ hasIdentifier: true, hasComposition: true }),
    message: DEMO_ILLUSTRATIVE_NOTICE,
  };
}

function reportedSample(): MaterialLookupData {
  return {
    match_status: "matched",
    match_type: "exact_gtin",
    product: {
      gtin: DEMO_GTIN_REPORTED,
      brand: ILLUSTRATIVE_BRAND,
      name: "Cotton Poplin Shirt",
      sku: "SAMPLE-REPORTED",
    },
    composition: {
      components: [
        { fiber_code: "cotton", fiber_name: "Cotton", percentage: 100, raw_value: "100% cotton" },
      ],
      primary_fiber: "cotton",
      natural_fiber_percentage: 100,
      total_percentage: 100,
      normalization_warnings: [],
    },
    evidence: {
      status: "reported_retailer",
      sources: [
        {
          type: "affiliate_feed",
          captured_at: "2026-06-02T12:00:00Z",
          reviewed_at: null,
        },
      ],
      last_updated: "2026-06-02T12:00:00Z",
    },
    dpp_alignment: dppAlignmentFor({ hasIdentifier: true, hasComposition: true }),
    message:
      "Illustrative reported-retailer example. Composition is an attributed catalog claim, not label-verified.",
  };
}

function missingSample(): MaterialLookupData {
  return {
    match_status: "not_found",
    match_type: "not_found",
    product: {
      gtin: DEMO_GTIN_MISSING,
      brand: null,
      name: null,
      sku: "SAMPLE-MISSING",
    },
    composition: { ...EMPTY_COMPOSITION },
    evidence: {
      status: "missing",
      sources: [],
      last_updated: null,
    },
    dpp_alignment: dppAlignmentFor({ hasIdentifier: true, hasComposition: false }),
    message:
      "No product-level composition is available for this demonstration identifier. No manufacturer was assumed from a sample prefix, and no composition was guessed.",
  };
}

export const DEMO_EXAMPLES = [
  {
    id: "verified" as const,
    label: "Illustrative verified-label",
    subtitle: "Exact GTIN · sample review protocol",
    query: DEMO_GTIN_VERIFIED,
  },
  {
    id: "reported" as const,
    label: "Reported source",
    subtitle: "Retailer / feed claim",
    query: DEMO_GTIN_REPORTED,
  },
  {
    id: "missing" as const,
    label: "No composition",
    subtitle: "Valid GTIN · nothing guessed",
    query: DEMO_GTIN_MISSING,
  },
];

const ALLOWLIST: Record<string, () => MaterialLookupData> = {
  [DEMO_GTIN_VERIFIED]: verifiedSample,
  [DEMO_GTIN_REPORTED]: reportedSample,
  [DEMO_GTIN_MISSING]: missingSample,
  "sample-verified": verifiedSample,
  "sample-reported": reportedSample,
  "sample-missing": missingSample,
};

export function isDemoAllowlisted(raw: string): boolean {
  const key = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const digits = key.replace(/\D/g, "");
  return Boolean(ALLOWLIST[key] || (digits && ALLOWLIST[digits]));
}

export function lookupDemoRecord(raw: string): MaterialLookupData | null {
  const key = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const digits = key.replace(/\D/g, "");
  const factory = ALLOWLIST[key] || (digits ? ALLOWLIST[digits] : undefined);
  if (factory) return factory();
  return null;
}

export function demoNotFound(gtin: string): MaterialLookupData {
  return {
    match_status: "not_found",
    match_type: "not_found",
    product: { gtin, brand: null, name: null },
    composition: { ...EMPTY_COMPOSITION },
    evidence: { status: "missing", sources: [], last_updated: null },
    dpp_alignment: dppAlignmentFor({ hasIdentifier: Boolean(gtin), hasComposition: false }),
    message:
      "This demonstration endpoint only serves curated sample records. It does not search the production catalog.",
  };
}

export function demoQueryIsGtinLike(raw: string): boolean {
  const parsed = parseGtin(raw);
  return parsed.ok;
}
