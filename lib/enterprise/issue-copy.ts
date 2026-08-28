import { parseIdentifierIssueDetail } from "./identity-reconciliation";

export function issueTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    missing_data: "Missing data",
    conflict: "Source conflict",
    validation: "Validation",
    evidence: "Evidence",
    identifier: "Identifier",
    supplier: "Supplier",
    regulatory: "Regulatory",
    review_required: "Review required",
  };
  return labels[type] || type.replaceAll("_", " ");
}

export function issueWhyItMatters(issue: {
  issue_type: string;
  title: string;
  severity: string;
}): string {
  if (issue.issue_type === "identifier") {
    return "Two source rows share an identifier. Confirm they are the same product, a variant, or a wrong identifier before publishing.";
  }
  if (issue.issue_type === "missing_data" && /composition/i.test(issue.title)) {
    return "A Digital Product Passport cannot publish without listed material composition.";
  }
  if (issue.issue_type === "missing_data" && /origin|country/i.test(issue.title)) {
    return "Country of origin is required before this product can be represented as complete.";
  }
  if (issue.issue_type === "conflict") {
    return "An approved field disagrees with a new source. Publishing is blocked until you accept the incoming value or keep the locked value.";
  }
  if (issue.issue_type === "validation") {
    return "Listed composition percentages do not total 100. The remainder was not invented.";
  }
  return "This finding must be reviewed before the product can be published.";
}

export function issueRecommendedAction(issue: {
  issue_type: string;
  severity: string;
}): string {
  if (issue.issue_type === "identifier") {
    return "Choose: confirm same product, treat as a separate variant/product, or correct the identifier.";
  }
  if (issue.issue_type === "missing_data") {
    return "Add the missing value in a later source file, then re-import.";
  }
  if (issue.issue_type === "conflict") {
    return "Resolve to accept the incoming source (re-approval required), or reject to keep the locked value.";
  }
  if (issue.issue_type === "validation") {
    return "Correct the composition in the source file so listed fibres total 100, then re-import.";
  }
  return "Resolve, reject, or mark not applicable.";
}

export function issueBlocksPublish(issue: { status: string; severity: string }): boolean {
  return issue.status === "open" && (issue.severity === "critical" || issue.severity === "high");
}

export function issueAffectedField(issue: {
  issue_type: string;
  title: string;
  detail?: string | null;
}): string {
  const ident = parseIdentifierIssueDetail(issue.detail);
  if (ident?.matchOn === "gtin") return "GTIN";
  if (ident?.matchOn === "sku") return "SKU";
  if (ident?.matchOn === "style") return "Style";
  const locked = String(issue.title || "").match(/^Locked (\S+)/);
  if (locked?.[1]) return locked[1];
  if (/composition/i.test(issue.title)) return "composition";
  if (/origin|country/i.test(issue.title)) return "manufacturing_country";
  if (/GTIN/i.test(issue.title)) return "GTIN";
  if (issue.issue_type === "identifier") return "identifier";
  return "—";
}

export function passportStateLabel(state: string | null | undefined): string {
  const labels: Record<string, string> = {
    incomplete: "Not ready",
    review_required: "Needs review",
    ready: "Ready to publish",
    published: "Published",
    update_required: "Update required",
    archived: "Archived",
  };
  const key = String(state || "");
  return labels[key] || (key ? key.replaceAll("_", " ") : "—");
}
