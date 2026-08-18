import type { SupabaseClient } from "@supabase/supabase-js";
import { gtinLookupCandidates } from "../gtin";
import { parseCompositionText } from "./composition";
import { dppAlignmentFor, EMPTY_COMPOSITION } from "./envelope";
import { evidenceSourceTypeFromStatus, evidenceStatusFromSource } from "./evidence";
import type { MaterialLookupData, MatchType, EvidenceStatus } from "./types";

type BarcodeRow = {
  upc_code?: string | null;
  brand?: string | null;
  product_name?: string | null;
  composition?: string | null;
  fiber_breakdown?: unknown;
  natural_fiber_percent?: number | null;
  fiber_primary?: string | null;
  source?: string | null;
  verified_by?: string | null;
  verification_date?: string | null;
  reviewed_at?: string | null;
  country_of_origin?: string | null;
  care_instructions?: string | null;
  updated_at?: string | null;
};

type ProductRow = {
  upc?: string | null;
  gtin?: string | null;
  brand_name?: string | null;
  name?: string | null;
  composition?: string | null;
  natural_fiber_percent?: number | null;
  approved?: string | null;
  is_active?: boolean | null;
  country_of_origin?: string | null;
  care_instructions?: string | null;
  updated_at?: string | null;
};

function asBreakdown(raw: unknown): Array<{ fiber?: string; percent?: number }> | null {
  return Array.isArray(raw) ? (raw as Array<{ fiber?: string; percent?: number }>) : null;
}

function fromBarcode(row: BarcodeRow, gtin: string): MaterialLookupData {
  const parsed = parseCompositionText(row.composition, asBreakdown(row.fiber_breakdown));
  const hasComposition = parsed.components.length > 0;
  const status = evidenceStatusFromSource({
    source: row.source,
    verifiedBy: row.verified_by,
    reviewedAt: row.reviewed_at || null,
    hasComposition,
  });
  return {
    match_status: "matched",
    match_type: "exact_gtin",
    product: {
      gtin,
      brand: row.brand || null,
      name: row.product_name || null,
    },
    composition: hasComposition ? parsed : { ...EMPTY_COMPOSITION },
    evidence: {
      status: hasComposition ? status : "missing",
      sources: hasComposition
        ? [
            {
              type: evidenceSourceTypeFromStatus(status, row.source),
              captured_at: row.verification_date || row.updated_at || null,
              reviewed_at: row.reviewed_at || null,
            },
          ]
        : [],
      last_updated: row.updated_at || row.verification_date || null,
    },
    dpp_alignment: dppAlignmentFor({
      hasIdentifier: true,
      hasComposition,
      countryOfOrigin: row.country_of_origin,
      careInstructions: row.care_instructions,
    }),
    message: hasComposition
      ? undefined
      : "Product identity was found. Product-level composition is not available.",
  };
}

function fromProduct(row: ProductRow, gtin: string): MaterialLookupData {
  const parsed = parseCompositionText(row.composition);
  const hasComposition = parsed.components.length > 0;
  const status = evidenceStatusFromSource({
    source: "products_catalog",
    hasComposition,
  });
  return {
    match_status: "matched",
    match_type: "exact_gtin",
    product: {
      gtin,
      brand: row.brand_name || null,
      name: row.name || null,
    },
    composition: hasComposition ? parsed : { ...EMPTY_COMPOSITION },
    evidence: {
      status: hasComposition ? status : "missing",
      sources: hasComposition
        ? [
            {
              type: "affiliate_feed",
              captured_at: row.updated_at || null,
              reviewed_at: null,
            },
          ]
        : [],
      last_updated: row.updated_at || null,
    },
    dpp_alignment: dppAlignmentFor({
      hasIdentifier: true,
      hasComposition,
      countryOfOrigin: row.country_of_origin,
      careInstructions: row.care_instructions,
    }),
  };
}

export function manufacturerOnlyResult(gtin: string, brand: string): MaterialLookupData {
  return {
    match_status: "manufacturer_only",
    match_type: "manufacturer_only",
    product: { gtin, brand, name: null },
    composition: { ...EMPTY_COMPOSITION },
    evidence: { status: "missing", sources: [], last_updated: null },
    dpp_alignment: dppAlignmentFor({ hasIdentifier: true, hasComposition: false }),
    message:
      "The company may be identified from a GS1 prefix. Product-level composition was not found and was not guessed.",
  };
}

export function notFoundResult(gtin: string): MaterialLookupData {
  return {
    match_status: "not_found",
    match_type: "not_found",
    product: { gtin, brand: null, name: null },
    composition: { ...EMPTY_COMPOSITION },
    evidence: { status: "missing", sources: [], last_updated: null },
    dpp_alignment: dppAlignmentFor({ hasIdentifier: true, hasComposition: false }),
    message: "No product-level composition record is available. No composition was guessed.",
  };
}

export async function lookupProductionComposition(
  supabase: SupabaseClient,
  gtin: string
): Promise<MaterialLookupData> {
  const candidates = gtinLookupCandidates(gtin);

  const evidenceQuery = await supabase
    .from("material_evidence")
    .select("upc_code, source_type, status, captured_at, reviewed_at")
    .in("upc_code", candidates)
    .limit(5);
  const evidenceRows = evidenceQuery.error ? [] : evidenceQuery.data || [];
  const evidence = evidenceRows[0] as
    | {
        source_type?: string | null;
        status?: string | null;
        captured_at?: string | null;
        reviewed_at?: string | null;
      }
    | undefined;

  const barcodeQuery = await supabase
    .from("barcode_compositions")
    .select(
      "upc_code, brand, product_name, composition, fiber_breakdown, natural_fiber_percent, fiber_primary, source, verified_by, verification_date, country_of_origin, care_instructions"
    )
    .in("upc_code", candidates)
    .limit(5);
  const barcodeRows = barcodeQuery.error ? [] : barcodeQuery.data || [];

  const barcode = (barcodeRows || []).find((row) => String(row.composition || "").trim()) || barcodeRows?.[0];
  if (barcode && String(barcode.composition || "").trim()) {
    const mapped = fromBarcode(barcode as BarcodeRow, gtin);
    return applyDocumentedEvidence(mapped, evidence);
  }

  const productQuery = await supabase
    .from("products")
    .select(
      "upc, brand_name, name, composition, natural_fiber_percent, approved, is_active, country_of_origin, care_instructions"
    )
    .eq("approved", "yes")
    .eq("is_active", true)
    .in("upc", candidates)
    .limit(3);

  const products = productQuery.error ? [] : productQuery.data || [];

  const product = (products || []).find((row) => String(row.composition || "").trim()) || products?.[0];
  if (product) {
    return applyDocumentedEvidence(fromProduct(product as ProductRow, gtin), evidence);
  }

  if (barcode?.brand) {
    return manufacturerOnlyResult(gtin, String(barcode.brand));
  }

  // Prefix identity only from the maintained prefix table — never invent a company.
  for (const length of [9, 8, 7, 6]) {
    if (gtin.length < length) continue;
    const prefix = gtin.substring(0, length);
    const { data: prefixRow, error: prefixError } = await supabase
      .from("upc_brand_prefixes")
      .select("brand_name")
      .eq("prefix", prefix)
      .maybeSingle();
    if (prefixError) break;
    if (prefixRow?.brand_name) {
      return manufacturerOnlyResult(gtin, String(prefixRow.brand_name));
    }
  }

  return notFoundResult(gtin);
}

const EVIDENCE_STATUSES = new Set<EvidenceStatus>([
  "verified_label",
  "reported_brand",
  "reported_retailer",
  "inferred",
  "unknown_legacy",
  "missing",
]);

function applyDocumentedEvidence(
  data: MaterialLookupData,
  evidence?: {
    source_type?: string | null;
    status?: string | null;
    captured_at?: string | null;
    reviewed_at?: string | null;
  }
): MaterialLookupData {
  if (!evidence?.status) return data;
  const requested = String(evidence.status) as EvidenceStatus;
  if (!EVIDENCE_STATUSES.has(requested)) return data;
  const verified = requested === "verified_label" && Boolean(evidence.reviewed_at);
  const status: EvidenceStatus = requested === "verified_label" && !verified ? "unknown_legacy" : requested;
  return {
    ...data,
    evidence: {
      status,
      sources: [
        {
          type: evidenceSourceTypeFromStatus(status, evidence.source_type),
          captured_at: evidence.captured_at || data.evidence.sources[0]?.captured_at || null,
          reviewed_at: status === "verified_label" ? evidence.reviewed_at || null : null,
        },
      ],
      last_updated: evidence.reviewed_at || evidence.captured_at || data.evidence.last_updated,
    },
  };
}

export function assertNoGuessedComposition(data: MaterialLookupData): boolean {
  if (data.match_type === "manufacturer_only" || data.match_type === "not_found") {
    return data.composition.components.length === 0;
  }
  return true;
}

export type { MatchType };
