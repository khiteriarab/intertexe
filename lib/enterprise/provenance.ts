import { formatOperatorTime } from "./reviewer-display";

export type ProvenanceSource = {
  id: string;
  label: string;
  system: string;
  retrievedAt: string | null;
  isCanonical: boolean;
  value: string | null;
};

export type FieldProvenance = {
  fieldKey: string;
  displayLabel: string;
  canonicalValue: string | null;
  canonicalState: string | null;
  approvedAt: string | null;
  approverLabel: string | null;
  sources: ProvenanceSource[];
};

const FIELD_LABELS: Record<string, string> = {
  composition: "Composition",
  manufacturing_country: "Country of origin",
  country_of_origin: "Country of origin",
  name: "Product name",
  sku: "SKU",
  gtin: "GTIN",
  category: "Category",
  materials: "Materials",
  care_instructions: "Care instructions",
};

type FieldRow = {
  id: string;
  field_key: string;
  original_value?: string | null;
  normalized_value?: string | null;
  state?: string | null;
  source_record_id?: string | null;
  updated_at?: string | null;
  reviewer?: { displayName?: string | null } | null;
};

type SourceRecordRow = {
  id: string;
  source_system?: string | null;
  retrieved_at?: string | null;
  created_at?: string | null;
  original_payload?: unknown;
};

function payloadValue(payload: unknown, fieldKey: string): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const candidates = [
    fieldKey,
    fieldKey.replace(/_/g, " "),
    fieldKey === "manufacturing_country" ? "Country of Origin" : null,
    fieldKey === "composition" ? "Composition" : null,
  ].filter(Boolean) as string[];
  for (const key of candidates) {
    if (p[key] != null && String(p[key]).trim()) return String(p[key]).trim();
  }
  return null;
}

export function buildFieldProvenance(
  fieldKey: string,
  fields: FieldRow[],
  sourceRecords: SourceRecordRow[]
): FieldProvenance | null {
  const field = fields.find((f) => f.field_key === fieldKey);
  if (!field) return null;

  const sources: ProvenanceSource[] = [];
  for (const record of sourceRecords) {
    const fromPayload = payloadValue(record.original_payload, fieldKey);
    const value = fromPayload || (record.id === field.source_record_id ? field.original_value : null);
    if (!value) continue;
    sources.push({
      id: record.id,
      label: record.source_system || "Upload",
      system: record.source_system || "upload",
      retrievedAt: record.retrieved_at || record.created_at || null,
      isCanonical: record.id === field.source_record_id && field.state === "approved",
      value,
    });
  }

  if (field.original_value && !sources.some((s) => s.value === field.original_value)) {
    sources.unshift({
      id: "normalized",
      label: "Normalized field",
      system: "intertexe",
      retrievedAt: field.updated_at || null,
      isCanonical: field.state === "approved",
      value: field.original_value,
    });
  }

  sources.sort((a, b) => {
    const ta = a.retrievedAt ? new Date(a.retrievedAt).getTime() : 0;
    const tb = b.retrievedAt ? new Date(b.retrievedAt).getTime() : 0;
    return tb - ta;
  });

  const canonicalSource = sources.find((s) => s.isCanonical) || sources[0] || null;

  return {
    fieldKey,
    displayLabel: FIELD_LABELS[fieldKey] || fieldKey.replace(/_/g, " "),
    canonicalValue: field.normalized_value || field.original_value || null,
    canonicalState: field.state || null,
    approvedAt: field.state === "approved" && field.updated_at ? formatOperatorTime(field.updated_at) : null,
    approverLabel: field.reviewer?.displayName || null,
    sources: sources.map((s) => ({
      ...s,
      retrievedAt: s.retrievedAt ? formatOperatorTime(s.retrievedAt) : null,
      isCanonical: canonicalSource ? s.id === canonicalSource.id : s.isCanonical,
    })),
  };
}

export function buildProductProvenanceBundle(
  fields: FieldRow[],
  sourceRecords: SourceRecordRow[],
  keys: string[] = ["composition", "manufacturing_country", "name", "category"]
): FieldProvenance[] {
  return keys
    .map((key) => buildFieldProvenance(key, fields, sourceRecords))
    .filter((row): row is FieldProvenance => row != null);
}
