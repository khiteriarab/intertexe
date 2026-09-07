import type { SupabaseClient } from "@supabase/supabase-js";
import { emitWorkflowEvent } from "./workflow-events";

export type ApprovalSubject = "product_fields" | "passport_publish" | "import_release" | "integration_change";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export async function createApprovalRequest(input: {
  client: SupabaseClient;
  organizationId: string;
  subjectType: ApprovalSubject;
  subjectId: string;
  title: string;
  detail?: string;
  requestComment?: string;
  assignedTo?: string | null;
  requestedBy?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await input.client
    .from("approval_requests")
    .insert({
      organization_id: input.organizationId,
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      title: input.title,
      detail: input.detail || null,
      request_comment: input.requestComment || null,
      assigned_to: input.assignedTo || null,
      requested_by: input.requestedBy || null,
      metadata: input.metadata || {},
    })
    .select("id")
    .maybeSingle();
  if (error || !data?.id) throw new Error(error?.message || "Could not create approval request.");

  await input.client.from("approval_request_events").insert({
    approval_request_id: data.id,
    organization_id: input.organizationId,
    actor_id: input.requestedBy || null,
    event_type: "requested",
    comment: input.requestComment || null,
  });

  const recipientIds = input.assignedTo ? [input.assignedTo] : [];
  await emitWorkflowEvent({
    client: input.client,
    organizationId: input.organizationId,
    actorId: input.requestedBy || null,
    kind: "approval_requested",
    title: `Approval requested: ${input.title}`,
    detail: input.detail || input.requestComment || null,
    audit: {
      action: "approval_requested",
      objectType: input.subjectType,
      objectId: input.subjectId,
      requestMeta: { approvalRequestId: data.id },
    },
    notify: recipientIds.length
      ? {
          recipientIds,
          category: "approval_requested",
          emailSubject: `Approval requested: ${input.title}`,
        }
      : undefined,
  });

  return data.id;
}

export async function decideApprovalRequest(input: {
  client: SupabaseClient;
  organizationId: string;
  approvalRequestId: string;
  status: "approved" | "rejected" | "cancelled";
  decidedBy: string;
  decisionComment?: string;
}) {
  const { data: existing } = await input.client
    .from("approval_requests")
    .select("id, status, title, subject_type, subject_id, requested_by, assigned_to")
    .eq("organization_id", input.organizationId)
    .eq("id", input.approvalRequestId)
    .maybeSingle();
  if (!existing) throw new Error("Approval request not found.");
  if (existing.status !== "pending") throw new Error("Approval request is no longer pending.");

  const { error } = await input.client
    .from("approval_requests")
    .update({
      status: input.status,
      decided_by: input.decidedBy,
      decided_at: new Date().toISOString(),
      decision_comment: input.decisionComment || null,
    })
    .eq("id", input.approvalRequestId);
  if (error) throw new Error(error.message);

  await input.client.from("approval_request_events").insert({
    approval_request_id: input.approvalRequestId,
    organization_id: input.organizationId,
    actor_id: input.decidedBy,
    event_type: input.status,
    comment: input.decisionComment || null,
  });

  const notifyIds = [existing.requested_by, existing.assigned_to].filter(Boolean) as string[];
  await emitWorkflowEvent({
    client: input.client,
    organizationId: input.organizationId,
    actorId: input.decidedBy,
    kind: "approval_decided",
    title: `Approval ${input.status}: ${existing.title}`,
    detail: input.decisionComment || null,
    audit: {
      action: `approval_${input.status}`,
      objectType: String(existing.subject_type),
      objectId: String(existing.subject_id),
      requestMeta: { approvalRequestId: input.approvalRequestId, status: input.status },
    },
    notify: notifyIds.length
      ? {
          recipientIds: Array.from(new Set(notifyIds)),
          category: "approval_decided",
          emailSubject: `Approval ${input.status}: ${existing.title}`,
        }
      : undefined,
  });
}

export async function listApprovalRequests(
  client: SupabaseClient,
  organizationId: string,
  status?: ApprovalStatus
) {
  let query = client
    .from("approval_requests")
    .select("id, subject_type, subject_id, status, title, detail, request_comment, decision_comment, requested_by, assigned_to, decided_by, decided_at, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return data || [];
}

export async function getApprovalHistory(client: SupabaseClient, approvalRequestId: string) {
  const { data } = await client
    .from("approval_request_events")
    .select("id, event_type, comment, actor_id, created_at")
    .eq("approval_request_id", approvalRequestId)
    .order("created_at", { ascending: true });
  return data || [];
}
