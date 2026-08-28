import type { SupabaseClient } from "@supabase/supabase-js";

function inferFieldKeyFromIssue(issue: {
  title: string;
  detail?: string | null;
}): string | null {
  const fromDetail = issue.detail?.match(/field:([a-z0-9_]+)/i)?.[1];
  if (fromDetail) return fromDetail;
  const lower = issue.title.toLowerCase();
  if (lower.includes("country of origin")) return "country_of_origin";
  if (lower.includes("composition")) return "composition";
  if (lower.includes("material")) return "materials";
  return null;
}

export async function createSupplierEvidenceRequest(input: {
  client: SupabaseClient;
  organizationId: string;
  issueId: string;
  requesterId: string | null;
  supplierName: string;
  supplierEmail?: string;
  dueAt?: string;
  notes?: string;
}) {
  const { data: issue } = await input.client
    .from("issues")
    .select("id, product_id, title, detail, issue_type, status")
    .eq("organization_id", input.organizationId)
    .eq("id", input.issueId)
    .maybeSingle();
  if (!issue?.product_id) throw new Error("Issue must be linked to a product.");
  if (issue.status !== "open") throw new Error("Only open issues can spawn supplier requests.");
  if (issue.issue_type !== "missing_data") {
    throw new Error("Supplier evidence requests are supported for missing-data issues.");
  }

  const fieldKey = inferFieldKeyFromIssue(issue);
  const requestedEvidence = [
    {
      field_key: fieldKey,
      evidence_type: "supplier_declaration",
      description: issue.title,
    },
  ];

  let supplierId: string | null = null;
  const email = input.supplierEmail?.trim().toLowerCase();
  if (email) {
    const existing = await input.client
      .from("suppliers")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("email", email)
      .maybeSingle();
    supplierId = existing.data?.id || null;
  }
  if (!supplierId) {
    const created = await input.client
      .from("suppliers")
      .insert({
        organization_id: input.organizationId,
        name: input.supplierName.trim(),
        email: email || null,
      })
      .select("id")
      .maybeSingle();
    supplierId = created.data?.id || null;
  }
  if (!supplierId) throw new Error("Could not create supplier.");

  const { data: request, error } = await input.client
    .from("supplier_requests")
    .insert({
      organization_id: input.organizationId,
      supplier_id: supplierId,
      product_id: issue.product_id,
      issue_id: issue.id,
      requester_id: input.requesterId,
      request_kind: "evidence",
      title: `Evidence request: ${issue.title}`,
      fields: requestedEvidence,
      requested_evidence: requestedEvidence,
      status: "open",
      due_at: input.dueAt || null,
    })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);

  await input.client.from("evidence_records").insert({
    organization_id: input.organizationId,
    product_id: issue.product_id,
    field_key: fieldKey,
    evidence_type: "supplier_declaration",
    source_supplier_id: supplierId,
    issue_id: issue.id,
    verification_status: "requested",
    access_class: "supply_chain",
    metadata: { supplier_request_id: request?.id, notes: input.notes || null },
  });

  await input.client.from("activity_events").insert({
    organization_id: input.organizationId,
    actor_id: input.requesterId,
    title: `Requested supplier evidence for issue ${issue.title}`,
    detail: `product:${issue.product_id}|issue:${issue.id}|request:${request?.id}`,
  });

  return { requestId: request?.id, supplierId };
}

export async function submitSupplierEvidence(input: {
  client: SupabaseClient;
  organizationId: string;
  requestId: string;
  submittedBy: string | null;
  payload: Record<string, unknown>;
}) {
  const { data: request } = await input.client
    .from("supplier_requests")
    .select("id, product_id, issue_id, requested_evidence")
    .eq("organization_id", input.organizationId)
    .eq("id", input.requestId)
    .maybeSingle();
  if (!request) throw new Error("Supplier request not found.");

  await input.client.from("supplier_submissions").insert({
    organization_id: input.organizationId,
    request_id: request.id,
    payload: input.payload,
    submitted_by: input.submittedBy,
    review_status: "pending",
  });

  await input.client
    .from("supplier_requests")
    .update({ status: "submitted" })
    .eq("id", request.id);

  const fieldKey =
    (Array.isArray(request.requested_evidence) &&
      (request.requested_evidence[0] as { field_key?: string })?.field_key) ||
    null;

  await input.client.from("evidence_records").insert({
    organization_id: input.organizationId,
    product_id: request.product_id,
    field_key: fieldKey,
    evidence_type: "supplier_submission",
    issue_id: request.issue_id,
    document_reference: String(input.payload.document_reference || input.payload.reference || ""),
    verification_status: "under_review",
    access_class: "supply_chain",
    metadata: { supplier_request_id: request.id, payload: input.payload },
  });
}

export async function approveSupplierEvidence(input: {
  client: SupabaseClient;
  organizationId: string;
  submissionId: string;
  reviewerId: string | null;
}) {
  const { data: submission } = await input.client
    .from("supplier_submissions")
    .select("id, request_id, payload")
    .eq("organization_id", input.organizationId)
    .eq("id", input.submissionId)
    .maybeSingle();
  if (!submission) throw new Error("Submission not found.");

  await input.client
    .from("supplier_submissions")
    .update({ review_status: "approved" })
    .eq("id", submission.id);

  const { data: request } = await input.client
    .from("supplier_requests")
    .select("id, product_id, issue_id, requested_evidence")
    .eq("id", submission.request_id)
    .maybeSingle();

  const fieldKey =
    (Array.isArray(request?.requested_evidence) &&
      (request?.requested_evidence[0] as { field_key?: string })?.field_key) ||
    null;

  await input.client
    .from("evidence_records")
    .update({
      verification_status: "verified",
      reviewer_id: input.reviewerId,
      verified_at: new Date().toISOString(),
    })
    .eq("organization_id", input.organizationId)
    .eq("issue_id", request?.issue_id || "")
    .eq("verification_status", "under_review");

  await input.client
    .from("supplier_requests")
    .update({ status: "closed" })
    .eq("id", submission.request_id);

  // Supplier submissions do not auto-modify approved canonical fields.
  return { fieldKey, productId: request?.product_id, issueId: request?.issue_id };
}
