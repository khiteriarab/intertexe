export type MappingSuggestion = {
  sourceColumn: string;
  canonicalField: string | null;
  confidence: "high" | "medium" | "low";
};

const HINTS: Array<{ match: RegExp; field: string }> = [
  { match: /style|style_no|style no|model/i, field: "style_code" },
  { match: /sku/i, field: "sku" },
  { match: /gtin|ean|upc/i, field: "gtin" },
  { match: /material|fiber|composition|fabric/i, field: "composition" },
  { match: /mat%|percent|%/i, field: "composition_percent" },
  { match: /factory|manufactur|cntry|country/i, field: "manufacturing_country" },
  { match: /category|cat/i, field: "category" },
  { match: /name|title|product/i, field: "name" },
];

export function suggestColumnMapping(columns: string[]): MappingSuggestion[] {
  return columns.map((sourceColumn) => {
    const hit = HINTS.find((hint) => hint.match.test(sourceColumn));
    return {
      sourceColumn,
      canonicalField: hit?.field || null,
      confidence: hit ? "medium" : "low",
    };
  });
}

export type ImportPreview = {
  rowsDetected: number;
  columnsDetected: string[];
  mappings: MappingSuggestion[];
  parsingWarnings: string[];
  estimatedNewProducts: number;
  estimatedUpdates: number;
  duplicateRisk: number;
};

export function previewImport(rows: Array<Record<string, string>>): ImportPreview {
  const columnsDetected = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row).filter((key) => key.trim())))
  );
  const mappings = suggestColumnMapping(columnsDetected);
  const parsingWarnings: string[] = [];
  if (rows.length === 0) parsingWarnings.push("No data rows detected");
  const skuKey = mappings.find((m) => m.canonicalField === "sku")?.sourceColumn;
  const seen = new Set<string>();
  let duplicateRisk = 0;
  for (const row of rows) {
    const sku = skuKey ? String(row[skuKey] || "").trim() : "";
    if (sku) {
      if (seen.has(sku)) duplicateRisk += 1;
      seen.add(sku);
    }
  }
  return {
    rowsDetected: rows.length,
    columnsDetected,
    mappings,
    parsingWarnings,
    estimatedNewProducts: rows.length - duplicateRisk,
    estimatedUpdates: 0,
    duplicateRisk,
  };
}

export function compositionPercentTotal(parts: number[]): { total: number; valid: boolean } {
  const total = parts.reduce((sum, n) => sum + n, 0);
  return { total, valid: Math.abs(total - 100) < 0.01 };
}

export function detectIdentifierCollision(existing: string[], incoming: string): boolean {
  return existing.includes(incoming);
}

export function applyColumnMapping(
  row: Record<string, string>,
  mapping: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [source, canonical] of Object.entries(mapping)) {
    if (!canonical) continue;
    out[canonical] = String(row[source] ?? "").trim();
  }
  return out;
}

export function previewImportWithCatalog(
  rows: Array<Record<string, string>>,
  mapping: Record<string, string>,
  existingKeys: Set<string>
): ImportPreview {
  const mapped = rows.map((row) => applyColumnMapping(row, mapping));
  const preview = previewImport(mapped);
  let estimatedUpdates = 0;
  let estimatedNewProducts = 0;
  for (const row of mapped) {
    const key = [row.gtin, row.sku, `${row.style_code}::${row.variant || ""}`]
      .map((part) => part?.trim())
      .find((part) => part);
    if (key && existingKeys.has(key.toLowerCase())) estimatedUpdates += 1;
    else estimatedNewProducts += 1;
  }
  return { ...preview, estimatedNewProducts, estimatedUpdates };
}
