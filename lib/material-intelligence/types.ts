export const MATERIAL_API_VERSION = "v1" as const;

export const DPP_ALIGNMENT_NOTICE =
  "This readiness mapping is informational and is not legal certification. Textile-specific requirements remain subject to the final EU delegated act and technical specifications.";

export const DPP_FRAMEWORK = "EU ESPR textiles, emerging requirements";

export type MatchStatus = "matched" | "manufacturer_only" | "not_found";

export type MatchType =
  | "exact_gtin"
  | "exact_sku"
  | "exact_product_url"
  | "manufacturer_only"
  | "not_found";

export type EvidenceStatus =
  | "verified_label"
  | "reported_brand"
  | "reported_retailer"
  | "inferred"
  | "unknown_legacy"
  | "missing";

export type DppAlignmentStatus = "mapped" | "partial" | "insufficient";

export type FiberComponent = {
  fiber_code: string;
  fiber_name: string;
  percentage: number | null;
  raw_value: string | null;
};

export type EvidenceSourceType =
  | "physical_label_scan"
  | "brand_source"
  | "retailer_page"
  | "affiliate_feed"
  | "inferred"
  | "unknown";

export type EvidenceSource = {
  type: EvidenceSourceType;
  captured_at: string | null;
  reviewed_at: string | null;
};

export type CompositionPayload = {
  components: FiberComponent[];
  primary_fiber: string | null;
  natural_fiber_percentage: number | null;
  total_percentage: number | null;
  normalization_warnings: string[];
};

export type MaterialLookupData = {
  match_status: MatchStatus;
  match_type: MatchType;
  product: {
    gtin: string;
    brand: string | null;
    name: string | null;
    sku?: string | null;
  };
  composition: CompositionPayload;
  evidence: {
    status: EvidenceStatus;
    sources: EvidenceSource[];
    last_updated: string | null;
  };
  dpp_alignment: {
    framework: string;
    status: DppAlignmentStatus;
    available_fields: string[];
    missing_fields: string[];
    notice: string;
  };
  message?: string;
};

export type MaterialApiSuccess = {
  api_version: typeof MATERIAL_API_VERSION;
  request_id: string;
  data: MaterialLookupData;
};

export type MaterialApiError = {
  api_version: typeof MATERIAL_API_VERSION;
  request_id: string;
  error: {
    code: string;
    message: string;
  };
};

export const DEFAULT_MISSING_DPP_FIELDS = [
  "country_of_origin",
  "care_instructions",
  "economic_operator",
  "repair_and_end_of_life_information",
] as const;
