import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeImportHeader } from "./import-preview";

export const DEFAULT_IMPORT_SOURCE_SYSTEM = "upload";

export function schemaFingerprint(columns: string[]): string {
  const normalized = Array.from(
    new Set(columns.map((column) => normalizeImportHeader(column)).filter(Boolean))
  ).sort();
  return createHash("sha256").update(normalized.join("\n")).digest("hex");
}

export function remapSavedMapping(
  columns: string[],
  saved: Record<string, string>
): Record<string, string> {
  const byNorm = new Map<string, string>();
  for (const [source, dest] of Object.entries(saved)) {
    byNorm.set(normalizeImportHeader(source), dest);
  }
  const out: Record<string, string> = {};
  for (const column of columns) {
    const dest = byNorm.get(normalizeImportHeader(column));
    if (dest != null) out[column] = dest;
  }
  return out;
}

export type SavedMappingTemplate = {
  id: string;
  mapping: Record<string, string>;
  mappingConfidence: string | null;
  sourceSystem: string;
  lastUsedAt: string | null;
};

function asMapping(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, String(value || "")])
  );
}

export async function loadMappingTemplate(
  client: SupabaseClient,
  organizationId: string,
  columns: string[],
  sourceSystem = DEFAULT_IMPORT_SOURCE_SYSTEM
): Promise<SavedMappingTemplate | null> {
  const fingerprint = schemaFingerprint(columns);
  const { data, error } = await client
    .from("import_mapping_templates")
    .select("id, mapping, mapping_confidence, source_system, last_used_at, schema_fingerprint, columns")
    .eq("organization_id", organizationId)
    .eq("source_system", sourceSystem)
    .eq("schema_fingerprint", fingerprint)
    .maybeSingle();
  if (!error && data?.mapping) {
    return {
      id: data.id,
      mapping: remapSavedMapping(columns, asMapping(data.mapping)),
      mappingConfidence: data.mapping_confidence || "approved",
      sourceSystem: data.source_system || sourceSystem,
      lastUsedAt: data.last_used_at || null,
    };
  }

  const { data: fallback } = await client
    .from("import_mapping_templates")
    .select("id, mapping, source_system, created_at")
    .eq("organization_id", organizationId)
    .eq("source_system", sourceSystem)
    .order("created_at", { ascending: false })
    .limit(8);
  const match = (fallback || []).find((row) => {
    const mapping = asMapping(row.mapping);
    const keys = Object.keys(mapping);
    if (!keys.length) return false;
    const incoming = new Set(columns.map(normalizeImportHeader));
    return keys.every((key) => incoming.has(normalizeImportHeader(key)));
  });
  if (!match) return null;
  return {
    id: match.id,
    mapping: remapSavedMapping(columns, asMapping(match.mapping)),
    mappingConfidence: "approved",
    sourceSystem: match.source_system || sourceSystem,
    lastUsedAt: match.created_at || null,
  };
}

export async function rememberMappingTemplate(input: {
  client: SupabaseClient;
  organizationId: string;
  columns: string[];
  mapping: Record<string, string>;
  approvedBy?: string | null;
  sourceSystem?: string;
}): Promise<void> {
  const sourceSystem = input.sourceSystem || DEFAULT_IMPORT_SOURCE_SYSTEM;
  const fingerprint = schemaFingerprint(input.columns);
  const assigned = Object.values(input.mapping).filter((value) => String(value || "").trim()).length;
  const confidence = assigned / Math.max(input.columns.length, 1) >= 0.7 ? "high" : "medium";
  const now = new Date().toISOString();
  const { data: existing, error: lookupError } = await input.client
    .from("import_mapping_templates")
    .select("id, version, mapping")
    .eq("organization_id", input.organizationId)
    .eq("source_system", sourceSystem)
    .eq("schema_fingerprint", fingerprint)
    .maybeSingle();
  if (!lookupError && existing?.id) {
    const mappingChanged = JSON.stringify(existing.mapping) !== JSON.stringify(input.mapping);
    await input.client
      .from("import_mapping_templates")
      .update({
        mapping: input.mapping,
        columns: input.columns,
        mapping_confidence: confidence,
        approved_by: input.approvedBy || null,
        last_used_at: now,
        version: mappingChanged ? Number(existing.version || 1) + 1 : existing.version,
      })
      .eq("id", existing.id);
    return;
  }
  const inserted = await input.client.from("import_mapping_templates").insert({
    organization_id: input.organizationId,
    name: `${sourceSystem}:${fingerprint.slice(0, 12)}`,
    source_system: sourceSystem,
    schema_fingerprint: fingerprint,
    source_schema_version: null,
    columns: input.columns,
    mapping: input.mapping,
    mapping_confidence: confidence,
    approved_by: input.approvedBy || null,
    last_used_at: now,
    source_priority: 0,
  });
  if (!inserted.error) return;
  await input.client.from("import_mapping_templates").insert({
    organization_id: input.organizationId,
    name: `${sourceSystem}:${fingerprint.slice(0, 12)}`,
    source_system: sourceSystem,
    mapping: input.mapping,
  });
}
