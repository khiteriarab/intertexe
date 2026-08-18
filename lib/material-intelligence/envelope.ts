import {
  DEFAULT_MISSING_DPP_FIELDS,
  DPP_ALIGNMENT_NOTICE,
  DPP_FRAMEWORK,
  MATERIAL_API_VERSION,
  type DppAlignmentStatus,
  type MaterialApiError,
  type MaterialApiSuccess,
  type MaterialLookupData,
} from "./types";

export function newRequestId(): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return `req_${id.slice(0, 20)}`;
}

export function successEnvelope(requestId: string, data: MaterialLookupData): MaterialApiSuccess {
  return {
    api_version: MATERIAL_API_VERSION,
    request_id: requestId,
    data,
  };
}

export function errorEnvelope(
  requestId: string,
  code: string,
  message: string
): MaterialApiError {
  return {
    api_version: MATERIAL_API_VERSION,
    request_id: requestId,
    error: { code, message },
  };
}

export function dppAlignmentFor(opts: {
  hasIdentifier: boolean;
  hasComposition: boolean;
  countryOfOrigin?: string | null;
  careInstructions?: string | null;
}): MaterialLookupData["dpp_alignment"] {
  const available: string[] = [];
  const missing: string[] = [...DEFAULT_MISSING_DPP_FIELDS];
  if (opts.hasIdentifier) available.push("product_identifier");
  if (opts.hasComposition) available.push("fiber_composition");
  if (opts.countryOfOrigin) {
    available.push("country_of_origin");
    const i = missing.indexOf("country_of_origin");
    if (i >= 0) missing.splice(i, 1);
  }
  if (opts.careInstructions) {
    available.push("care_instructions");
    const i = missing.indexOf("care_instructions");
    if (i >= 0) missing.splice(i, 1);
  }
  let status: DppAlignmentStatus = "insufficient";
  if (available.includes("fiber_composition") && missing.length === 0) status = "mapped";
  else if (available.length) status = "partial";
  return {
    framework: DPP_FRAMEWORK,
    status,
    available_fields: available,
    missing_fields: missing,
    notice: DPP_ALIGNMENT_NOTICE,
  };
}

export const EMPTY_COMPOSITION = {
  components: [],
  primary_fiber: null,
  natural_fiber_percentage: null,
  total_percentage: null,
  normalization_warnings: [] as string[],
};
