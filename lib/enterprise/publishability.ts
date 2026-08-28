export type PublishabilityResult =
  | { status: "ready" }
  | { status: "blocked"; blockers: string[] };

export function evaluatePublishability(input: {
  identityPresent: boolean;
  requiredFieldsPresent: boolean;
  criticalConflicts: number;
  criticalValidations: number;
  requiredApprovalsComplete: boolean;
  passportIdentifier: string | null;
  resolverDestination: string | null;
  unresolvedMissingData?: number;
  unresolvedIdentityIssues?: number;
}): PublishabilityResult {
  const blockers: string[] = [];
  if (!input.identityPresent) blockers.push("required product identity is missing");
  if (!input.requiredFieldsPresent) blockers.push("required fields for the current ruleset are missing");
  if (input.criticalConflicts > 0) blockers.push("unresolved critical conflicts remain");
  if (input.criticalValidations > 0) blockers.push("unresolved critical validation errors remain");
  if ((input.unresolvedMissingData || 0) > 0) blockers.push("required data is still missing");
  if ((input.unresolvedIdentityIssues || 0) > 0) blockers.push("identifier conflicts remain");
  if (!input.requiredApprovalsComplete) blockers.push("required review approvals are incomplete");
  if (!input.passportIdentifier) blockers.push("passport identifier is missing");
  if (!input.resolverDestination) blockers.push("resolver destination is missing");
  return blockers.length ? { status: "blocked", blockers } : { status: "ready" };
}
