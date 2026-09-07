import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export type ExportKind = "products" | "issues" | "passports" | "audit_logs";

export async function createGovernedExport(
  client: SupabaseClient,
  organizationId: string,
  kind: ExportKind,
  actorId?: string | null
): Promise<{ snapshotId: string; rowCount: number; format: "json" }> {
  let rows: Record<string, unknown>[] = [];
  if (kind === "products") {
    const { data } = await client
      .from("products")
      .select("id, name, sku, style_code, category, passport_state, lifecycle, data_completeness, created_at, updated_at")
      .eq("organization_id", organizationId)
      .eq("lifecycle", "active");
    rows = (data || []) as Record<string, unknown>[];
  } else if (kind === "issues") {
    const { data } = await client
      .from("issues")
      .select("id, product_id, issue_type, severity, status, title, detail, created_at, updated_at")
      .eq("organization_id", organizationId);
    rows = (data || []) as Record<string, unknown>[];
  } else if (kind === "passports") {
    const { data } = await client
      .from("passports")
      .select("id, product_id, status, public_id, version_label, published_at, created_at")
      .eq("organization_id", organizationId);
    rows = (data || []) as Record<string, unknown>[];
  } else if (kind === "audit_logs") {
    const { data } = await client
      .from("audit_logs")
      .select("id, action, object_type, object_id, previous_ref, resulting_ref, request_meta, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(5000);
    rows = (data || []) as Record<string, unknown>[];
  }

  const payload = { kind, exportedAt: new Date().toISOString(), rowCount: rows.length, rows };
  const checksum = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const { data: snapshot, error } = await client
    .from("export_snapshots")
    .insert({
      organization_id: organizationId,
      export_type: kind,
      generated_by: actorId || null,
      query_scope: payload,
      checksum,
      source_version: "v1",
    })
    .select("id")
    .maybeSingle();
  if (error || !snapshot?.id) throw new Error(error?.message || "Export failed.");

  await client.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: actorId || null,
    action: "export_created",
    object_type: kind,
    object_id: snapshot.id,
    resulting_ref: `${rows.length} rows`,
    request_meta: { kind },
  });

  return { snapshotId: snapshot.id, rowCount: rows.length, format: "json" };
}

export async function listExports(client: SupabaseClient, organizationId: string, limit = 20) {
  const { data } = await client
    .from("export_snapshots")
    .select("id, export_type, checksum, generated_at, generated_by, query_scope")
    .eq("organization_id", organizationId)
    .order("generated_at", { ascending: false })
    .limit(limit);
  return (data || []).map((row) => ({
    id: row.id,
    export_kind: row.export_type,
    row_count: (row.query_scope as { rowCount?: number } | null)?.rowCount ?? null,
    created_at: row.generated_at,
  }));
}

export async function getExportPayload(client: SupabaseClient, organizationId: string, snapshotId: string) {
  const { data } = await client
    .from("export_snapshots")
    .select("query_scope, export_type, generated_at")
    .eq("organization_id", organizationId)
    .eq("id", snapshotId)
    .maybeSingle();
  return data;
}
