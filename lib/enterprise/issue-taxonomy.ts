/** Extended issue taxonomy via detail subtypes — preserves DB CHECK on issue_type. */

export type IssueSubtype =
  | "missing_composition"
  | "conflicting_composition"
  | "missing_origin"
  | "missing_supplier"
  | "missing_facility"
  | "missing_traceability_tier"
  | "missing_certification"
  | "expired_certification"
  | "missing_evidence"
  | "unverified_claim"
  | "impact_data_missing"
  | "regulatory_field_missing"
  | "passport_publish_blocker";

export const ISSUE_SUBTYPE_LABELS: Record<IssueSubtype, string> = {
  missing_composition: "Missing composition",
  conflicting_composition: "Conflicting composition",
  missing_origin: "Missing origin",
  missing_supplier: "Missing supplier",
  missing_facility: "Missing facility",
  missing_traceability_tier: "Missing traceability tier",
  missing_certification: "Missing certification",
  expired_certification: "Expired certification",
  missing_evidence: "Missing evidence",
  unverified_claim: "Unverified claim",
  impact_data_missing: "Impact data missing",
  regulatory_field_missing: "Regulatory field missing",
  passport_publish_blocker: "Passport publish blocker",
};

export function parseIssueSubtype(detail: string | null | undefined): IssueSubtype | null {
  const match = String(detail || "").match(/subtype:([a-z_]+)/i);
  if (!match?.[1]) return null;
  const key = match[1] as IssueSubtype;
  return key in ISSUE_SUBTYPE_LABELS ? key : null;
}

export function formatIssueSubtypeLabel(detail: string | null | undefined, fallbackType: string): string {
  const subtype = parseIssueSubtype(detail);
  if (subtype) return ISSUE_SUBTYPE_LABELS[subtype];
  return fallbackType.replaceAll("_", " ");
}

export function issueSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Blocking",
    blocking: "Blocking",
  };
  return labels[severity] || severity;
}

export const SUPPLIER_REQUEST_KINDS = [
  { id: "composition", label: "Request missing composition" },
  { id: "origin", label: "Request origin data" },
  { id: "certification", label: "Request certification / evidence" },
  { id: "facility", label: "Request facility data" },
  { id: "traceability", label: "Request traceability data" },
  { id: "evidence", label: "Request general evidence" },
] as const;

export const COLLABORATION_STATUSES = [
  "draft",
  "sent",
  "awaiting_response",
  "received",
  "under_review",
  "accepted",
  "rejected",
  "closed",
] as const;

export function collaborationStatusLabel(status: string): string {
  return status.replaceAll("_", " ");
}
