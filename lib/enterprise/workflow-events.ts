import type { SupabaseClient } from "@supabase/supabase-js";
import { emitEnterpriseNotification } from "./notifications";

export type WorkflowEventKind =
  | "import_completed"
  | "import_failed"
  | "issue_assigned"
  | "approval_requested"
  | "approval_decided"
  | "fields_approved"
  | "passport_ready"
  | "passport_published"
  | "integration_error"
  | "supplier_evidence";

export type WorkflowEventInput = {
  client: SupabaseClient;
  organizationId: string;
  actorId?: string | null;
  kind: WorkflowEventKind;
  title: string;
  detail?: string | null;
  href?: string | null;
  audit?: {
    action: string;
    objectType: string;
    objectId?: string | null;
    previousRef?: string | null;
    resultingRef?: string | null;
    requestMeta?: Record<string, unknown>;
  };
  notify?: {
    recipientIds: string[];
    category: Parameters<typeof emitEnterpriseNotification>[0]["category"];
    emailSubject?: string;
  };
  job?: {
    importId?: string;
    jobType: string;
    stage: string;
    status: string;
    errorMessage?: string | null;
  };
};

/** Central workflow event bus: audit + activity + optional notification + job update. */
export async function emitWorkflowEvent(input: WorkflowEventInput): Promise<void> {
  const { client, organizationId, actorId, kind, title, detail, href, audit, notify, job } = input;

  await client.from("activity_events").insert({
    organization_id: organizationId,
    actor_id: actorId || null,
    title,
    detail: detail || null,
  });

  if (audit) {
    await client.from("audit_logs").insert({
      organization_id: organizationId,
      actor_id: actorId || null,
      action: audit.action,
      object_type: audit.objectType,
      object_id: audit.objectId || null,
      previous_ref: audit.previousRef || null,
      resulting_ref: audit.resultingRef || null,
      request_meta: { kind, ...(audit.requestMeta || {}) },
    });
  }

  if (notify?.recipientIds.length) {
    for (const recipientId of notify.recipientIds) {
      await emitEnterpriseNotification({
        client,
        organizationId,
        recipientId,
        category: notify.category,
        title,
        body: detail || undefined,
        href: href || undefined,
        emailSubject: notify.emailSubject,
      });
    }
  }

  if (job?.importId) {
    await client
      .from("processing_jobs")
      .update({
        status: job.status,
        stage: job.stage,
        finished_at: ["succeeded", "failed", "cancelled"].includes(job.status)
          ? new Date().toISOString()
          : null,
      })
      .eq("import_id", job.importId)
      .eq("job_type", job.jobType);
  }
}
