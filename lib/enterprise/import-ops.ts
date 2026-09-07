import type { SupabaseClient } from "@supabase/supabase-js";
import { commitMappedImport } from "./pipeline";

export type ImportSummary = {
  rowsTotal?: number;
  rowsProcessed?: number;
  rowsSkipped?: number;
  productsTouched?: number;
  issuesCreated?: number;
  collisions?: number;
  sameProductUpdates?: number;
};

export async function recordImportRowError(
  client: SupabaseClient,
  input: {
    organizationId: string;
    importId: string;
    rowNumber: number;
    errorCode: string;
    message: string;
    fieldKey?: string;
    rawExcerpt?: Record<string, unknown>;
  }
) {
  await client.from("import_row_errors").insert({
    organization_id: input.organizationId,
    import_id: input.importId,
    row_number: input.rowNumber,
    field_key: input.fieldKey || null,
    error_code: input.errorCode,
    message: input.message,
    raw_excerpt: input.rawExcerpt || null,
  });
}

export async function finalizeImportRecord(
  client: SupabaseClient,
  importId: string,
  input: { status: "succeeded" | "failed"; summary?: ImportSummary; errorMessage?: string }
) {
  await client
    .from("imports")
    .update({
      status: input.status,
      summary: input.summary || {},
      error_message: input.errorMessage || null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", importId);
}

export async function loadImportHistory(client: SupabaseClient, organizationId: string, limit = 50) {
  const { data: imports } = await client
    .from("imports")
    .select("id, original_filename, status, summary, error_message, created_at, finished_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const importIds = (imports || []).map((i) => i.id);
  const { data: errorCounts } = importIds.length
    ? await client.from("import_row_errors").select("import_id").in("import_id", importIds)
    : { data: [] };

  const errorsByImport = new Map<string, number>();
  for (const row of errorCounts || []) {
    errorsByImport.set(row.import_id, (errorsByImport.get(row.import_id) || 0) + 1);
  }

  return (imports || []).map((row) => ({
    id: row.id,
    filename: row.original_filename || "Catalog import",
    status: row.status,
    summary: (row.summary || {}) as ImportSummary,
    errorMessage: row.error_message,
    errorCount: errorsByImport.get(row.id) || 0,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  }));
}

export async function loadImportDetail(client: SupabaseClient, organizationId: string, importId: string) {
  const { data: importRow } = await client
    .from("imports")
    .select("id, original_filename, status, summary, error_message, mapping, created_at, finished_at")
    .eq("organization_id", organizationId)
    .eq("id", importId)
    .maybeSingle();
  if (!importRow) return null;

  const [{ data: errors }, { data: job }] = await Promise.all([
    client
      .from("import_row_errors")
      .select("id, row_number, field_key, error_code, message, created_at")
      .eq("import_id", importId)
      .order("row_number")
      .limit(500),
    client
      .from("processing_jobs")
      .select("id, status, stage, error, started_at, finished_at")
      .eq("import_id", importId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    import: importRow,
    errors: errors || [],
    job: job || null,
  };
}

/** Retry uses stored mapping from a prior import — caller must supply rows. */
export async function retryImport(input: {
  client: SupabaseClient;
  organizationId: string;
  importId: string;
  rows: Record<string, string>[];
  filename?: string;
}) {
  const detail = await loadImportDetail(input.client, input.organizationId, input.importId);
  if (!detail?.import) throw new Error("Import not found.");
  const mapping = (detail.import.mapping || {}) as Record<string, string>;
  return commitMappedImport({
    client: input.client,
    organizationId: input.organizationId,
    filename: input.filename || detail.import.original_filename || "retry-import.csv",
    mapping,
    rows: input.rows,
  });
}
