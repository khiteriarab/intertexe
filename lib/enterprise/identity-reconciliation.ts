export type IdentifierClass = "same_product" | "possible_variant" | "ambiguous_collision";

export type IdentifierKey = "gtin" | "sku" | "style";

export type IdentifierSnapshot = {
  name: string;
  sku: string;
  gtin: string;
  style: string;
  variant: string;
  rowIndex?: number;
  productId?: string;
};

export type IdentifierFate = {
  rowIndex: number;
  action: "create" | "update_same_product" | "create_with_collision";
  classification: IdentifierClass | null;
  matchOn: IdentifierKey | null;
  identifierValue: string | null;
  matchedLabel: string | null;
  incoming: IdentifierSnapshot;
  matched: IdentifierSnapshot | null;
};

export function snapshotFromMapped(
  mapped: Record<string, string>,
  extras?: { rowIndex?: number; productId?: string }
): IdentifierSnapshot {
  return {
    name: String(mapped.name || "").trim(),
    sku: String(mapped.sku || "").trim(),
    gtin: String(mapped.gtin || "").trim(),
    style: String(mapped.style_code || mapped.style || "").trim(),
    variant: String(mapped.variant || "").trim(),
    rowIndex: extras?.rowIndex,
    productId: extras?.productId,
  };
}

function norm(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

export function classifyIdentifierMatch(
  incoming: IdentifierSnapshot,
  existing: IdentifierSnapshot
): IdentifierClass | null {
  const sameGtin = Boolean(incoming.gtin && existing.gtin && incoming.gtin === existing.gtin);
  const sameSku = Boolean(incoming.sku && existing.sku && norm(incoming.sku) === norm(existing.sku));
  const sameStyle = Boolean(incoming.style && existing.style && norm(incoming.style) === norm(existing.style));
  if (!sameGtin && !sameSku && !sameStyle) return null;

  const differentSku = Boolean(incoming.sku && existing.sku && norm(incoming.sku) !== norm(existing.sku));
  const differentGtin = Boolean(incoming.gtin && existing.gtin && incoming.gtin !== existing.gtin);
  const differentVariant = Boolean(
    incoming.variant && existing.variant && norm(incoming.variant) !== norm(existing.variant)
  );

  if (sameGtin && sameSku) return "same_product";
  if (sameSku && !differentGtin && (!incoming.gtin || !existing.gtin || sameGtin)) return "same_product";
  if (sameGtin && !incoming.sku && !existing.sku) return "same_product";
  if (sameGtin && differentSku) return "ambiguous_collision";
  if (sameSku && differentGtin) return "ambiguous_collision";
  if (sameGtin && (!incoming.sku || !existing.sku)) return "ambiguous_collision";
  if (sameStyle && (differentSku || differentVariant || !sameSku)) return "possible_variant";
  if (sameStyle) return "possible_variant";
  return "ambiguous_collision";
}

export function wouldAutoMerge(classification: IdentifierClass | null): boolean {
  return classification === "same_product";
}

export function matchKey(
  incoming: IdentifierSnapshot,
  existing: IdentifierSnapshot
): { matchOn: IdentifierKey; identifierValue: string } | null {
  if (incoming.gtin && existing.gtin && incoming.gtin === existing.gtin) {
    return { matchOn: "gtin", identifierValue: incoming.gtin };
  }
  if (incoming.sku && existing.sku && norm(incoming.sku) === norm(existing.sku)) {
    return { matchOn: "sku", identifierValue: incoming.sku };
  }
  if (incoming.style && existing.style && norm(incoming.style) === norm(existing.style)) {
    return { matchOn: "style", identifierValue: incoming.style };
  }
  return null;
}

function findBestMatch(
  incoming: IdentifierSnapshot,
  pool: IdentifierSnapshot[]
): IdentifierSnapshot | null {
  if (incoming.gtin) {
    const hit = pool.find((row) => row.gtin && row.gtin === incoming.gtin);
    if (hit) return hit;
  }
  if (incoming.sku) {
    const hit = pool.find((row) => row.sku && norm(row.sku) === norm(incoming.sku));
    if (hit) return hit;
  }
  if (incoming.style) {
    const hit = pool.find((row) => row.style && norm(row.style) === norm(incoming.style));
    if (hit) return hit;
  }
  return null;
}

function labelFor(row: IdentifierSnapshot): string {
  if (row.productId) return row.name || row.sku || "existing product";
  if (row.rowIndex != null) return `row ${row.rowIndex + 1}`;
  return row.name || row.sku || "matched record";
}

export function planIdentifierRows(
  incoming: IdentifierSnapshot[],
  catalog: IdentifierSnapshot[]
): IdentifierFate[] {
  const working: IdentifierSnapshot[] = catalog.map((row) => ({ ...row }));
  const fates: IdentifierFate[] = [];
  for (const row of incoming) {
    const matched = findBestMatch(row, working);
    const classification = matched ? classifyIdentifierMatch(row, matched) : null;
    const key = matched ? matchKey(row, matched) : null;
    if (matched && wouldAutoMerge(classification)) {
      fates.push({
        rowIndex: row.rowIndex ?? fates.length,
        action: "update_same_product",
        classification,
        matchOn: key?.matchOn || null,
        identifierValue: key?.identifierValue || null,
        matchedLabel: labelFor(matched),
        incoming: row,
        matched,
      });
      continue;
    }
    if (matched && classification) {
      fates.push({
        rowIndex: row.rowIndex ?? fates.length,
        action: "create_with_collision",
        classification,
        matchOn: key?.matchOn || null,
        identifierValue: key?.identifierValue || null,
        matchedLabel: labelFor(matched),
        incoming: row,
        matched,
      });
      working.push(row);
      continue;
    }
    fates.push({
      rowIndex: row.rowIndex ?? fates.length,
      action: "create",
      classification: null,
      matchOn: null,
      identifierValue: null,
      matchedLabel: null,
      incoming: row,
      matched: null,
    });
    working.push(row);
  }
  return fates;
}

export function identifierClassLabel(classification: IdentifierClass | null): string {
  if (classification === "same_product") return "Same product (duplicate records / update)";
  if (classification === "possible_variant") return "Possible variant of an existing style";
  if (classification === "ambiguous_collision") return "Ambiguous identifier collision";
  return "New product";
}

export type IdentifierIssueDetail = {
  kind: "identifier_reconciliation";
  classification: IdentifierClass;
  matchOn: IdentifierKey | null;
  identifierValue: string | null;
  matchedProductId: string | null;
  incoming: IdentifierSnapshot;
  matched: IdentifierSnapshot | null;
  availableActions: Array<"confirm_same_product" | "treat_as_separate" | "correct_identifier">;
  resolution?: {
    action: string;
    actorId: string | null;
    actorName: string;
    actorRole?: string | null;
    at: string;
    correctedIdentifier?: string;
  };
};

export function buildIdentifierIssueDetail(input: {
  classification: IdentifierClass;
  matchOn: IdentifierKey | null;
  identifierValue: string | null;
  matchedProductId: string | null;
  incoming: IdentifierSnapshot;
  matched: IdentifierSnapshot | null;
}): IdentifierIssueDetail {
  return {
    kind: "identifier_reconciliation",
    classification: input.classification,
    matchOn: input.matchOn,
    identifierValue: input.identifierValue,
    matchedProductId: input.matchedProductId,
    incoming: input.incoming,
    matched: input.matched,
    availableActions: ["confirm_same_product", "treat_as_separate", "correct_identifier"],
  };
}

export function parseIdentifierIssueDetail(raw: string | null | undefined): IdentifierIssueDetail | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as IdentifierIssueDetail;
    if (parsed?.kind !== "identifier_reconciliation") return null;
    return parsed;
  } catch {
    return null;
  }
}
