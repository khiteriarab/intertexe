import type { SupabaseClient } from "@supabase/supabase-js";
import { loadOrgMemberDirectory, reviewerFromDirectory } from "./reviewer-display";

export async function loadAuditLogs(
  client: SupabaseClient,
  organizationId: string,
  input?: { action?: string; objectType?: string; limit?: number; offset?: number }
) {
  const directory = await loadOrgMemberDirectory(client, organizationId);
  let query = client
    .from("audit_logs")
    .select("id, action, object_type, object_id, previous_ref, resulting_ref, request_meta, actor_id, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(input?.offset || 0, (input?.offset || 0) + (input?.limit || 100) - 1);
  if (input?.action) query = query.eq("action", input.action);
  if (input?.objectType) query = query.eq("object_type", input.objectType);
  const { data } = await query;
  return (data || []).map((row) => ({
    ...row,
    actor: reviewerFromDirectory(directory, row.actor_id),
  }));
}

export async function auditLogActions(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("audit_logs")
    .select("action")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(500);
  return Array.from(new Set((data || []).map((r) => r.action))).sort();
}
