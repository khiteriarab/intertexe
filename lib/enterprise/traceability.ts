import type { SupabaseClient } from "@supabase/supabase-js";

export const TRACEABILITY_TIERS = [
  { tier: 1, label: "Tier 1 · Manufacturer", role: "Garment assembly / final manufacturing" },
  { tier: 2, label: "Tier 2 · Supplier", role: "Fabric / component supplier" },
  { tier: 3, label: "Tier 3 · Material processor", role: "Spinning, weaving, dyeing, finishing" },
  { tier: 4, label: "Tier 4 · Raw material", role: "Fiber farm, mine, or raw material source" },
] as const;

export type TraceabilityTierStatus = "known" | "unknown" | "missing" | "not_provided";

export type TraceabilityTierRow = {
  tier: number;
  label: string;
  role: string;
  status: TraceabilityTierStatus;
  facility: string | null;
  country: string | null;
  countryCode: string | null;
  supplierId: string | null;
  supplierName: string | null;
  evidenceStatus: string | null;
  sourceRecordId: string | null;
  confidence: number | null;
  nodeId: string | null;
};

export type ProductTraceability = {
  productId: string;
  completenessPct: number;
  knownTierCount: number;
  missingTierLabels: string[];
  tiers: TraceabilityTierRow[];
  warnings: string[];
};

export type CatalogTraceabilitySummary = {
  productCount: number;
  tier1Pct: number;
  tier2Pct: number;
  tier3PlusPct: number;
  verifiedOriginPct: number;
  supplierEvidencePct: number;
  completeChainPct: number;
  avgCompletenessPct: number;
  weakestCategories: Array<{ category: string; avgCompleteness: number; productCount: number }>;
};

function tierStatusFromNode(node: {
  data_status?: string | null;
  facility_name?: string | null;
  country_code?: string | null;
} | null): TraceabilityTierStatus {
  if (!node) return "not_provided";
  if (node.data_status === "missing" || node.data_status === "unknown") return node.data_status as TraceabilityTierStatus;
  if (node.facility_name || node.country_code) return "known";
  return "unknown";
}

export function computeTraceabilityCompleteness(tiers: TraceabilityTierRow[]): number {
  if (!tiers.length) return 0;
  const known = tiers.filter((t) => t.status === "known").length;
  return Math.round((known / tiers.length) * 100);
}

export async function loadProductTraceability(
  client: SupabaseClient,
  organizationId: string,
  productId: string,
  fields?: Array<{ field_key: string; normalized_value?: string | null; original_value?: string | null }>
): Promise<ProductTraceability> {
  const [{ data: nodes }, { data: evidence }, { data: suppliers }, fieldRows] = await Promise.all([
    client
      .from("supply_chain_nodes")
      .select(
        "id, tier, tier_label, facility_name, country_code, supplier_id, source_record_id, evidence_id, confidence, data_status"
      )
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .order("tier"),
    client
      .from("evidence_records")
      .select("id, verification_status")
      .eq("organization_id", organizationId)
      .eq("product_id", productId),
    client.from("suppliers").select("id, name").eq("organization_id", organizationId),
    fields
      ? Promise.resolve(fields)
      : client
          .from("normalized_fields")
          .select("field_key, normalized_value, original_value")
          .eq("organization_id", organizationId)
          .eq("product_id", productId)
          .then((r) => r.data || []),
  ]);

  const evidenceById = new Map((evidence || []).map((e) => [e.id, e.verification_status]));
  const supplierById = new Map((suppliers || []).map((s) => [s.id, s.name]));
  const nodeByTier = new Map((nodes || []).map((n) => [n.tier, n]));

  const originField =
    fieldRows.find((f) => f.field_key === "manufacturing_country") ||
    fieldRows.find((f) => f.field_key === "country_of_origin");

  const tiers: TraceabilityTierRow[] = TRACEABILITY_TIERS.map((def) => {
    const node = nodeByTier.get(def.tier) || null;
    let status = tierStatusFromNode(node);
    let facility = node?.facility_name || null;
    let countryCode = node?.country_code || null;
    let supplierId = node?.supplier_id || null;
    let supplierName = node?.supplier_id ? supplierById.get(node.supplier_id) || null : null;

    if (def.tier === 1 && !node && originField?.normalized_value) {
      status = "known";
      countryCode = String(originField.normalized_value).toUpperCase().slice(0, 2);
      facility = null;
    }

    return {
      tier: def.tier,
      label: def.label,
      role: def.role,
      status,
      facility,
      country: countryCode,
      countryCode,
      supplierId,
      supplierName,
      evidenceStatus: node?.evidence_id ? evidenceById.get(node.evidence_id) || "linked" : null,
      sourceRecordId: node?.source_record_id || null,
      confidence: node?.confidence != null ? Number(node.confidence) : null,
      nodeId: node?.id || null,
    };
  });

  const completenessPct = computeTraceabilityCompleteness(tiers);
  const missingTierLabels = tiers.filter((t) => t.status !== "known").map((t) => t.label);
  const warnings: string[] = [];
  if (!tiers.find((t) => t.tier === 1 && t.status === "known")) {
    warnings.push("Tier 1 manufacturer is not recorded.");
  }
  if (tiers.filter((t) => t.status === "known").length < 2) {
    warnings.push("Upstream tiers (2–4) are largely missing — traceability chain is incomplete.");
  }

  return {
    productId,
    completenessPct,
    knownTierCount: tiers.filter((t) => t.status === "known").length,
    missingTierLabels,
    tiers,
    warnings,
  };
}

export async function loadCatalogTraceabilitySummary(
  client: SupabaseClient,
  organizationId: string
): Promise<CatalogTraceabilitySummary> {
  const [{ data: products }, { data: nodes }, { data: originFields }, { data: supplierEvidence }] =
    await Promise.all([
      client
        .from("products")
        .select("id, category")
        .eq("organization_id", organizationId)
        .eq("lifecycle", "active"),
      client
        .from("supply_chain_nodes")
        .select("product_id, tier, data_status, country_code, facility_name")
        .eq("organization_id", organizationId),
      client
        .from("normalized_fields")
        .select("product_id, field_key, normalized_value")
        .eq("organization_id", organizationId)
        .in("field_key", ["manufacturing_country", "country_of_origin"]),
      client
        .from("evidence_records")
        .select("product_id, verification_status")
        .eq("organization_id", organizationId)
        .not("source_supplier_id", "is", null),
    ]);

  const rows = products || [];
  const count = rows.length;
  if (!count) {
    return {
      productCount: 0,
      tier1Pct: 0,
      tier2Pct: 0,
      tier3PlusPct: 0,
      verifiedOriginPct: 0,
      supplierEvidencePct: 0,
      completeChainPct: 0,
      avgCompletenessPct: 0,
      weakestCategories: [],
    };
  }

  const nodesByProduct = new Map<string, typeof nodes>();
  for (const node of nodes || []) {
    const list = nodesByProduct.get(node.product_id) || [];
    list.push(node);
    nodesByProduct.set(node.product_id, list);
  }

  const originByProduct = new Map<string, string>();
  for (const field of originFields || []) {
    if (field.product_id && field.normalized_value) {
      originByProduct.set(field.product_id, String(field.normalized_value));
    }
  }

  const evidenceProducts = new Set(
    (supplierEvidence || [])
      .filter((e) => ["verified", "received", "under_review"].includes(String(e.verification_status)))
      .map((e) => e.product_id)
      .filter(Boolean)
  );

  let tier1 = 0;
  let tier2 = 0;
  let tier3Plus = 0;
  let verifiedOrigin = 0;
  let completeChain = 0;
  let completenessSum = 0;
  const categoryStats = new Map<string, { sum: number; count: number }>();

  for (const product of rows) {
    const productNodes = nodesByProduct.get(product.id) || [];
    const hasTier1Node = productNodes.some((n) => n.tier === 1 && (n.country_code || n.facility_name));
    const hasTier1Origin = hasTier1Node || originByProduct.has(product.id);
    const hasTier2 = productNodes.some((n) => n.tier === 2 && (n.country_code || n.facility_name));
    const hasTier3Plus = productNodes.some((n) => n.tier >= 3 && (n.country_code || n.facility_name));

    if (hasTier1Origin) tier1 += 1;
    if (hasTier2) tier2 += 1;
    if (hasTier3Plus) tier3Plus += 1;
    if (hasTier1Origin && originByProduct.has(product.id)) verifiedOrigin += 1;

    const knownTiers = new Set<number>();
    if (hasTier1Origin) knownTiers.add(1);
    for (const n of productNodes) {
      if (n.country_code || n.facility_name) knownTiers.add(n.tier);
    }
    const completeness = Math.round((knownTiers.size / 4) * 100);
    completenessSum += completeness;
    if (knownTiers.size === 4) completeChain += 1;

    const cat = String(product.category || "Uncategorized");
    const bucket = categoryStats.get(cat) || { sum: 0, count: 0 };
    bucket.sum += completeness;
    bucket.count += 1;
    categoryStats.set(cat, bucket);
  }

  const pct = (n: number) => Math.round((n / count) * 100);

  return {
    productCount: count,
    tier1Pct: pct(tier1),
    tier2Pct: pct(tier2),
    tier3PlusPct: pct(tier3Plus),
    verifiedOriginPct: pct(verifiedOrigin),
    supplierEvidencePct: pct(evidenceProducts.size),
    completeChainPct: pct(completeChain),
    avgCompletenessPct: Math.round(completenessSum / count),
    weakestCategories: Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        avgCompleteness: Math.round(stats.sum / stats.count),
        productCount: stats.count,
      }))
      .sort((a, b) => a.avgCompleteness - b.avgCompleteness)
      .slice(0, 5),
  };
}
