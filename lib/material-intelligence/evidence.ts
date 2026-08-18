import type { EvidenceSourceType, EvidenceStatus } from "./types";

/**
 * Historical barcode_compositions.source / verified_by values.
 * Never upgrade retailer, affiliate-feed, scan-without-review, or inferred data
 * to verified_label.
 */
export function evidenceStatusFromSource(input: {
  source?: string | null;
  verifiedBy?: string | null;
  reviewedAt?: string | null;
  hasComposition: boolean;
}): EvidenceStatus {
  if (!input.hasComposition) return "missing";
  if (input.reviewedAt && (input.verifiedBy === "label_reviewer" || input.source === "physical_label_scan")) {
    return "verified_label";
  }
  const source = String(input.source || "").toLowerCase();
  const verifiedBy = String(input.verifiedBy || "").toLowerCase();
  if (source === "inferred" || verifiedBy === "inferred" || source === "openai_inferred") {
    return "inferred";
  }
  if (
    source === "brand" ||
    source === "brand_catalog" ||
    source === "brand_source" ||
    verifiedBy === "brand"
  ) {
    return "reported_brand";
  }
  if (
    source === "products_catalog" ||
    source === "retailer_feed" ||
    source === "affiliate_feed" ||
    source === "affiliate" ||
    source.includes("retailer")
  ) {
    return "reported_retailer";
  }
  // user_scan without a documented review protocol is evidence, not verification.
  if (source === "user_scan" || verifiedBy === "user_scan" || source === "barcode_database") {
    return "unknown_legacy";
  }
  if (source === "external_api") return "unknown_legacy";
  return "unknown_legacy";
}

export function evidenceSourceTypeFromStatus(
  status: EvidenceStatus,
  source?: string | null
): EvidenceSourceType {
  if (status === "verified_label") return "physical_label_scan";
  if (status === "reported_brand") return "brand_source";
  if (status === "reported_retailer") {
    const s = String(source || "").toLowerCase();
    if (s.includes("affiliate")) return "affiliate_feed";
    return "retailer_page";
  }
  if (status === "inferred") return "inferred";
  return "unknown";
}

export function cannotBeVerifiedLabel(status: EvidenceStatus): boolean {
  return status !== "verified_label";
}
