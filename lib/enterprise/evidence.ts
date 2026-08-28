export type EvidenceVerificationStatus =
  | "missing"
  | "requested"
  | "received"
  | "under_review"
  | "verified"
  | "rejected"
  | "expired";

export type EvidenceRecord = {
  id: string;
  product_id: string | null;
  field_key: string | null;
  evidence_type: string;
  issuing_organization: string | null;
  source_supplier_id: string | null;
  document_reference: string | null;
  issue_id: string | null;
  issued_at: string | null;
  expires_at: string | null;
  verification_status: EvidenceVerificationStatus;
  reviewer_id: string | null;
  verified_at: string | null;
  access_class: string;
};

export function evidenceBlocksReadiness(status: EvidenceVerificationStatus): boolean {
  return status === "missing" || status === "requested" || status === "rejected" || status === "expired";
}

export function inferEvidenceStatusFromIssue(issue: {
  issue_type: string;
  title: string;
  status: string;
}): EvidenceVerificationStatus {
  if (issue.issue_type !== "missing_data") return "missing";
  if (issue.status === "resolved") return "verified";
  if (/requested|supplier/i.test(issue.title)) return "requested";
  return "missing";
}

export function fieldEvidenceSummary(
  fieldKey: string,
  records: EvidenceRecord[],
  openIssues: Array<{ issue_type: string; title: string; status: string; detail?: string | null }>
): { status: EvidenceVerificationStatus; detail: string } {
  const forField = records.filter((row) => row.field_key === fieldKey);
  if (forField.some((row) => row.verification_status === "verified")) {
    return { status: "verified", detail: "Verified evidence on file." };
  }
  if (forField.some((row) => row.verification_status === "under_review")) {
    return { status: "under_review", detail: "Evidence under review." };
  }
  if (forField.some((row) => row.verification_status === "received")) {
    return { status: "received", detail: "Evidence received, not yet verified." };
  }
  if (forField.some((row) => row.verification_status === "requested")) {
    return { status: "requested", detail: "Evidence requested from supplier." };
  }

  const issue = openIssues.find(
    (row) =>
      row.issue_type === "missing_data" &&
      row.status === "open" &&
      (row.detail?.includes(`field:${fieldKey}`) || row.title.toLowerCase().includes(fieldKey.replaceAll("_", " ")))
  );
  if (issue) {
    return {
      status: inferEvidenceStatusFromIssue(issue),
      detail: issue.title,
    };
  }

  return { status: "missing", detail: "No evidence linked." };
}
