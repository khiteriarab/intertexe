import {
  identifierClassLabel,
  planIdentifierRows,
  snapshotFromMapped,
  type IdentifierFate,
} from "./identity-reconciliation";

export type MappingSuggestion = {
  sourceColumn: string;
  canonicalField: string | null;
  confidence: "high" | "medium" | "low";
};

export const CANONICAL_IMPORT_FIELDS = [
  "name",
  "sku",
  "gtin",
  "style_code",
  "variant",
  "category",
  "composition",
  "manufacturing_country",
] as const;

export type CanonicalImportField = (typeof CANONICAL_IMPORT_FIELDS)[number];

export function normalizeImportHeader(column: string): string {
  return column
    .trim()
    .toLowerCase()
    .replace(/[%]+/g, " percent ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(column: string): string {
  return normalizeImportHeader(column);
}

/** Exact normalized headers that are safe to pre-fill. Ambiguous ERP names stay medium. */
const HIGH_EXACT: Record<string, CanonicalImportField> = {
  sku: "sku",
  "item sku": "sku",
  "product sku": "sku",
  "sku code": "sku",
  "article sku": "sku",
  name: "name",
  "product name": "name",
  "item name": "name",
  title: "name",
  "product title": "name",
  composition: "composition",
  "material composition": "composition",
  "fiber composition": "composition",
  "fibre composition": "composition",
  "fiber content": "composition",
  "fibre content": "composition",
  materials: "composition",
  material: "composition",
  gtin: "gtin",
  ean: "gtin",
  upc: "gtin",
  barcode: "gtin",
  style: "style_code",
  "style no": "style_code",
  "style number": "style_code",
  "style code": "style_code",
  stylecode: "style_code",
  variant: "variant",
  color: "variant",
  colour: "variant",
  size: "variant",
  category: "category",
  "product category": "category",
  "country of origin": "manufacturing_country",
  origin: "manufacturing_country",
  "origin country": "manufacturing_country",
  "manufacturing country": "manufacturing_country",
  "made in": "manufacturing_country",
  country: "manufacturing_country",
};

const MEDIUM_PATTERNS: Array<{ match: RegExp; field: CanonicalImportField }> = [
  { match: /^style/, field: "style_code" },
  { match: /^model$/, field: "style_code" },
  { match: /^material(?:\s+\d+)?$/, field: "composition" },
  { match: /^mat percent$|^percent$|^composition percent$/, field: "composition" },
  { match: /^factory|^cntry|^country/, field: "manufacturing_country" },
  { match: /^product$/, field: "name" },
  { match: /^sku/, field: "sku" },
  { match: /^gtin|^ean|^upc/, field: "gtin" },
  { match: /^name|^title/, field: "name" },
  { match: /composition|fiber|fibre|fabric/, field: "composition" },
  { match: /^cat |^cat$|category/, field: "category" },
];

export function suggestColumnMapping(columns: string[]): MappingSuggestion[] {
  return columns.map((sourceColumn) => {
    const normalized = normalizeHeader(sourceColumn);
    if (!normalized) {
      return { sourceColumn, canonicalField: null, confidence: "low" };
    }
    const high = HIGH_EXACT[normalized];
    if (high) {
      return { sourceColumn, canonicalField: high, confidence: "high" };
    }
    const medium = MEDIUM_PATTERNS.find((row) => row.match.test(normalized));
    if (medium) {
      return { sourceColumn, canonicalField: medium.field, confidence: "medium" };
    }
    return { sourceColumn, canonicalField: null, confidence: "low" };
  });
}

function assignedOperatorMapping(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const assigned = Object.entries(raw as Record<string, unknown>)
    .map(([source, value]) => [source, String(value || "").trim()] as const)
    .filter(([, value]) => value.length > 0);
  if (!assigned.length) return null;
  return Object.fromEntries(assigned);
}

/** Pre-fill only high-confidence fields. Empty operator mapping is treated as “not yet confirmed”. */
export function mappingForPreview(
  columns: string[],
  operatorMapping?: unknown,
  savedMapping?: Record<string, string> | null
): {
  suggested: MappingSuggestion[];
  mapping: Record<string, string>;
  mappingSource: "operator" | "saved_template" | "heuristic";
} {
  const suggested = suggestColumnMapping(columns);
  const operator = assignedOperatorMapping(operatorMapping);
  const saved =
    savedMapping && Object.keys(savedMapping).length > 0 ? savedMapping : null;
  const mapping: Record<string, string> = {};
  let mappingSource: "operator" | "saved_template" | "heuristic" = "heuristic";
  for (const row of suggested) {
    if (operator) {
      mapping[row.sourceColumn] = operator[row.sourceColumn] || "";
      mappingSource = "operator";
    } else if (saved && Object.prototype.hasOwnProperty.call(saved, row.sourceColumn)) {
      mapping[row.sourceColumn] = saved[row.sourceColumn] || "";
      mappingSource = "saved_template";
    } else {
      mapping[row.sourceColumn] =
        row.confidence === "high" && row.canonicalField ? row.canonicalField : "";
    }
  }
  return { suggested, mapping, mappingSource };
}

export type ImportPreview = {
  rowsDetected: number;
  columnsDetected: string[];
  mappings: MappingSuggestion[];
  parsingWarnings: string[];
  estimatedNewProducts: number;
  estimatedUpdates: number;
  duplicateRisk: number;
  reconciliations: IdentifierFate[];
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
    reconciliations: [],
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
  existingKeys: Set<string>,
  catalog: Array<{
    productId?: string;
    name: string;
    sku: string;
    gtin: string;
    style: string;
    variant: string;
  }> = []
): ImportPreview {
  const mapped = rows.map((row) => applyColumnMapping(row, mapping));
  const preview = previewImport(mapped);
  const incoming = mapped.map((row, rowIndex) => snapshotFromMapped(row, { rowIndex }));
  const catalogIdentities =
    catalog.length > 0
      ? catalog
      : Array.from(existingKeys).map((key) => ({
          name: "",
          sku: /^\d{8,14}$/.test(key) ? "" : key,
          gtin: /^\d{8,14}$/.test(key) ? key : "",
          style: key.includes("::") ? key.split("::")[0] : "",
          variant: key.includes("::") ? key.split("::")[1] || "" : "",
        }));
  const fates = planIdentifierRows(incoming, catalogIdentities);
  const estimatedUpdates = fates.filter((row) => row.action === "update_same_product").length;
  const estimatedNewProducts = fates.length - estimatedUpdates;
  const duplicateRisk = fates.filter((row) => row.action === "create_with_collision").length;
  const warnings = [...preview.parsingWarnings];
  for (const fate of fates.filter((row) => row.action === "create_with_collision")) {
    warnings.push(
      `Row ${fate.rowIndex + 1}: ${identifierClassLabel(fate.classification)} on ${fate.matchOn || "identifier"} ${fate.identifierValue || ""} (matched ${fate.matchedLabel}). Kept as a separate product until you confirm.`
    );
  }
  for (const fate of fates.filter((row) => row.action === "update_same_product")) {
    warnings.push(
      `Row ${fate.rowIndex + 1}: matched existing ${fate.matchedLabel} via ${fate.matchOn} ${fate.identifierValue || ""} — treated as the same product.`
    );
  }
  return {
    ...preview,
    estimatedNewProducts,
    estimatedUpdates,
    duplicateRisk,
    parsingWarnings: warnings,
    reconciliations: fates.filter((row) => row.action !== "create"),
  };
}
