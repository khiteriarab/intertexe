export const ESPR_FOUNDATION_RULESET = "espr-foundation.v1";

export type RequirementObligationKind =
  | "espr_base"
  | "textile_delegated_act"
  | "intertexe_best_practice"
  | "awaiting_rule";

export type RequirementEvaluationStatus =
  | "satisfied"
  | "missing"
  | "invalid"
  | "conflicting"
  | "evidence_required"
  | "not_applicable"
  | "awaiting_rule";

export type RegulatoryRequirementRow = {
  id: string;
  requirement_key: string | null;
  field_key: string;
  required: boolean;
  authoritative_source: string | null;
  source_reference: string | null;
  source_url: string | null;
  access_class: string | null;
  severity: string | null;
  obligation_kind: RequirementObligationKind | null;
  applicability: Record<string, unknown> | null;
};

export type RequirementEvaluation = {
  requirementKey: string;
  fieldKey: string;
  status: RequirementEvaluationStatus;
  obligationKind: RequirementObligationKind;
  severity: string | null;
  accessClass: string | null;
  authoritativeSource: string | null;
  sourceReference: string | null;
  detail: string;
};

export type RegulatoryEvaluationResult = {
  rulesetVersion: string;
  frameworkName: string;
  evaluatedAt: string;
  overall: "ready" | "needs_attention" | "awaiting_regulation";
  requirements: RequirementEvaluation[];
};

type FieldRow = {
  field_key: string;
  normalized_value: string | null;
  state: string | null;
  access_class: string | null;
};

export function evaluateRegulatoryRequirements(input: {
  rulesetVersion: string;
  frameworkName: string;
  requirements: RegulatoryRequirementRow[];
  product: { name?: string | null; sku?: string | null; style_code?: string | null };
  fields: FieldRow[];
  identifiers: Array<{ identifier_type: string; identifier_value: string }>;
  passportPublicId?: string | null;
  openIssues?: Array<{ issue_type: string; field_key?: string | null }>;
}): RegulatoryEvaluationResult {
  const fieldMap = new Map(input.fields.map((row) => [row.field_key, row]));
  const evaluations: RequirementEvaluation[] = [];

  for (const req of input.requirements) {
    const obligation = req.obligation_kind || "espr_base";
    if (obligation === "textile_delegated_act" || obligation === "awaiting_rule") {
      evaluations.push({
        requirementKey: req.requirement_key || req.field_key,
        fieldKey: req.field_key,
        status: "awaiting_rule",
        obligationKind: obligation,
        severity: req.severity,
        accessClass: req.access_class,
        authoritativeSource: req.authoritative_source,
        sourceReference: req.source_reference,
        detail: "Awaiting textile sector delegated act or published rule.",
      });
      continue;
    }

    const status = evaluateOneRequirement(req, input, fieldMap);
    evaluations.push(status);
  }

  const hasAwaiting = evaluations.some((row) => row.status === "awaiting_rule");
  const hasBlocking = evaluations.some(
    (row) =>
      row.status === "missing" ||
      row.status === "invalid" ||
      row.status === "conflicting" ||
      row.status === "evidence_required"
  );

  return {
    rulesetVersion: input.rulesetVersion,
    frameworkName: input.frameworkName,
    evaluatedAt: new Date().toISOString(),
    overall: hasAwaiting && !hasBlocking ? "awaiting_regulation" : hasBlocking ? "needs_attention" : "ready",
    requirements: evaluations,
  };
}

function evaluateOneRequirement(
  req: RegulatoryRequirementRow,
  input: {
    product: { name?: string | null; sku?: string | null; style_code?: string | null };
    fields: FieldRow[];
    identifiers: Array<{ identifier_type: string; identifier_value: string }>;
    passportPublicId?: string | null;
    openIssues?: Array<{ issue_type: string; field_key?: string | null }>;
  },
  fieldMap: Map<string, FieldRow>
): RequirementEvaluation {
  const base = {
    requirementKey: req.requirement_key || req.field_key,
    fieldKey: req.field_key,
    obligationKind: (req.obligation_kind || "espr_base") as RequirementObligationKind,
    severity: req.severity,
    accessClass: req.access_class,
    authoritativeSource: req.authoritative_source,
    sourceReference: req.source_reference,
  };

  if (req.field_key === "name") {
    const value = input.product.name?.trim();
    return {
      ...base,
      status: value ? "satisfied" : "missing",
      detail: value ? "Product name present." : "Product name missing.",
    };
  }

  if (req.field_key === "sku") {
    const hasSku = Boolean(input.product.sku?.trim() || input.product.style_code?.trim());
    const gtin = fieldMap.get("gtin")?.normalized_value?.trim();
    const idGtin = input.identifiers.find((row) => row.identifier_type === "gtin")?.identifier_value;
    const ok = hasSku || Boolean(gtin || idGtin);
    return {
      ...base,
      status: ok ? "satisfied" : "missing",
      detail: ok ? "SKU/style or GTIN present." : "No SKU, style code, or GTIN.",
    };
  }

  if (req.field_key === "composition") {
    const field = fieldMap.get("composition");
    const value = field?.normalized_value?.trim();
    if (!value) return { ...base, status: "missing", detail: "Composition not normalized." };
    const conflict = input.openIssues?.some(
      (issue) => issue.issue_type === "conflict" && issue.field_key === "composition"
    );
    if (conflict) return { ...base, status: "conflicting", detail: "Open composition conflict." };
    return { ...base, status: "satisfied", detail: "Composition present." };
  }

  if (req.field_key === "public_resolver_id") {
    const ok = Boolean(input.passportPublicId?.trim());
    return {
      ...base,
      status: ok ? "satisfied" : "missing",
      detail: ok ? "Public resolver ID assigned." : "Passport not published — no resolver ID.",
    };
  }

  return {
    ...base,
    status: "not_applicable",
    detail: "Requirement not evaluated in ESPR foundation ruleset.",
  };
}
