import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportSummary } from "./import-ops-shared";

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
