import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeMissingStagesForProduct,
  loadTraceabilityContext,
  parseTraceabilityPeriod,
  periodCutoff,
  priorPeriodCutoff,
} from "./traceability-filters";

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

export const SUPPLY_CHAIN_STAGES = [
  { id: "raw_material", tier: 4, label: "Raw Material" },
  { id: "processing", tier: 3, label: "Processing" },
  { id: "fabric_mill", tier: 2, label: "Fabric Mill" },
  { id: "garment_assembly", tier: 1, label: "Garment Assembly" },
  { id: "product", tier: 0, label: "Product" },
  { id: "passport", tier: -1, label: "Passport" },
] as const;

export type TraceabilityStageTone = "complete" | "progress" | "attention";

export type TraceabilityStageStat = {
  id: string;
  label: string;
  pct: number;
  status: string;
  tone: TraceabilityStageTone;
};

export type TraceabilityCategoryStat = {
  category: string;
  pct: number;
  productCount: number;
};

export type TraceabilityPriorityGap = {
  id: string;
  label: string;
  count: number;
  issueType: string | null;
  href: string;
};

export type TraceabilityProductRow = {
  id: string;
  name: string;
  sku: string | null;
  styleCode: string | null;
  category: string;
  imageUrl: string | null;
  completenessPct: number;
  countryPath: string[];
  missingEvidence: string;
  status: "good" | "progress" | "attention";
  href: string;
  missingStages: string[];
};

export type TraceabilityDashboardData = {
  summary: CatalogTraceabilitySummary & {
    passportsLinked: number;
    passportsLinkedPct: number;
    completenessTrend: number | null;
  };
  stages: TraceabilityStageStat[];
  sourcing: {
    countries: Array<{ code: string; label: string; productCount: number }>;
    supplierCount: number;
    productsMapped: number;
  };
  categories: TraceabilityCategoryStat[];
  priorityGaps: TraceabilityPriorityGap[];
  products: TraceabilityProductRow[];
};

function stageTone(pct: number): TraceabilityStageTone {
  if (pct >= 85) return "complete";
  if (pct >= 50) return "progress";
  return "attention";
}

function stageStatus(pct: number): string {
  if (pct >= 100) return "Complete";
  if (pct >= 85) return "Mostly complete";
  if (pct >= 50) return "In progress";
  return "Needs attention";
}

function productStatus(pct: number): TraceabilityProductRow["status"] {
  if (pct >= 75) return "good";
  if (pct >= 40) return "progress";
  return "attention";
}

const COUNTRY_LABELS: Record<string, string> = {
  PT: "Portugal",
  IT: "Italy",
  TR: "Turkey",
  IN: "India",
  ES: "Spain",
  FR: "France",
  DE: "Germany",
  GB: "United Kingdom",
  CN: "China",
  US: "United States",
};

function normalizeCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (raw.length === 2) return raw.toUpperCase();
  const lower = raw.toLowerCase();
  const aliases: Record<string, string> = {
    portugal: "PT",
    italy: "IT",
    turkey: "TR",
    india: "IN",
    spain: "ES",
    france: "FR",
    germany: "DE",
    china: "CN",
  };
  return aliases[lower] || null;
}

function tierKnown(
  productNodes: Array<{ tier: number; country_code?: string | null; facility_name?: string | null }>,
  tier: number,
  hasTier1Origin: boolean
): boolean {
  if (tier === 1) {
    return (
      hasTier1Origin ||
      productNodes.some((n) => n.tier === 1 && (n.country_code || n.facility_name))
    );
  }
  return productNodes.some((n) => n.tier === tier && (n.country_code || n.facility_name));
}

export async function loadTraceabilityDashboard(
  client: SupabaseClient,
  organizationId: string,
  slug: string,
  options: { period?: string | null } = {}
): Promise<TraceabilityDashboardData> {
  const base = `/dashboard/${slug}`;
  const period = parseTraceabilityPeriod(options.period);
  const cutoff = periodCutoff(period);
  const priorCutoff = priorPeriodCutoff(period);
  const summary = await loadCatalogTraceabilitySummary(client, organizationId);
  const traceCtx = await loadTraceabilityContext(client, organizationId);

  const [
    { data: products },
    { data: nodes },
    { data: originFields },
    { data: passports },
    { data: suppliers },
    { data: issues },
  ] = await Promise.all([
    client
      .from("products")
      .select("id, name, sku, style_code, category, passport_state, last_updated_at")
      .eq("organization_id", organizationId)
      .eq("lifecycle", "active")
      .order("last_updated_at", { ascending: false }),
    client
      .from("supply_chain_nodes")
      .select("product_id, tier, country_code, facility_name, supplier_id")
      .eq("organization_id", organizationId),
    client
      .from("normalized_fields")
      .select("product_id, field_key, normalized_value")
      .eq("organization_id", organizationId)
      .in("field_key", ["manufacturing_country", "country_of_origin"]),
    client
      .from("passports")
      .select("id, product_id, state")
      .eq("organization_id", organizationId),
    client.from("suppliers").select("id").eq("organization_id", organizationId),
    client
      .from("issues")
      .select("id, issue_type, title, status, product_id")
      .eq("organization_id", organizationId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  let rows = products || [];
  const allRows = rows;
  if (cutoff) {
    rows = rows.filter((p) => p.last_updated_at && new Date(p.last_updated_at) >= cutoff);
  }
  const count = rows.length;

  let priorAvgCompleteness: number | null = null;
  if (cutoff && priorCutoff && allRows.length) {
    let priorSum = 0;
    let priorCount = 0;
    for (const product of allRows) {
      if (!product.last_updated_at) continue;
      const updated = new Date(product.last_updated_at);
      if (updated < priorCutoff || updated >= cutoff) continue;
      const missing = computeMissingStagesForProduct(product.id, product.passport_state, traceCtx);
      const completenessPct = Math.round(((4 - missing.length) / 4) * 100);
      priorSum += completenessPct;
      priorCount += 1;
    }
    if (priorCount) priorAvgCompleteness = Math.round(priorSum / priorCount);
  }
  const nodesByProduct = new Map<string, NonNullable<typeof nodes>>();
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

  const passportProducts = new Set((passports || []).map((p) => p.product_id).filter(Boolean));
  const publishedPassportProducts = new Set(
    (passports || [])
      .filter((p) => ["published", "update_required"].includes(String(p.state)))
      .map((p) => p.product_id)
      .filter(Boolean)
  );

  const stageCounts = {
    raw_material: 0,
    processing: 0,
    fabric_mill: 0,
    garment_assembly: 0,
    product: 0,
    passport: 0,
  };

  const countryProductCounts = new Map<string, number>();
  const categoryStats = new Map<string, { sum: number; count: number }>();
  const productRows: TraceabilityProductRow[] = [];
  const openIssues = issues || [];

  for (const product of rows) {
    const productNodes = nodesByProduct.get(product.id) || [];
    const hasTier1Origin = originByProduct.has(product.id);
    const knownTiers = new Set<number>();
    if (tierKnown(productNodes, 1, hasTier1Origin)) knownTiers.add(1);
    for (const n of productNodes) {
      if (n.country_code || n.facility_name) knownTiers.add(n.tier);
    }
    const completenessPct = Math.round((knownTiers.size / 4) * 100);

    if (tierKnown(productNodes, 4, false)) stageCounts.raw_material += 1;
    if (tierKnown(productNodes, 3, false)) stageCounts.processing += 1;
    if (tierKnown(productNodes, 2, false)) stageCounts.fabric_mill += 1;
    if (tierKnown(productNodes, 1, hasTier1Origin)) stageCounts.garment_assembly += 1;
    if (knownTiers.size >= 2 || completenessPct >= 25) stageCounts.product += 1;
    if (
      passportProducts.has(product.id) ||
      ["published", "ready", "update_required"].includes(String(product.passport_state))
    ) {
      stageCounts.passport += 1;
    }

    const countryPath: string[] = [];
    for (const tier of [4, 3, 2, 1]) {
      const node = productNodes.find((n) => n.tier === tier && n.country_code);
      const code = normalizeCountryCode(node?.country_code);
      if (code && !countryPath.includes(code)) countryPath.push(code);
    }
    if (countryPath.length === 0 && hasTier1Origin) {
      const code = normalizeCountryCode(originByProduct.get(product.id));
      if (code) countryPath.push(code);
    }
    for (const code of countryPath) {
      countryProductCounts.set(code, (countryProductCounts.get(code) || 0) + 1);
    }

    const cat = String(product.category || "Uncategorized");
    const bucket = categoryStats.get(cat) || { sum: 0, count: 0 };
    bucket.sum += completenessPct;
    bucket.count += 1;
    categoryStats.set(cat, bucket);

    const productIssues = openIssues.filter((i) => i.product_id === product.id);
    const missingTierLabels = TRACEABILITY_TIERS.filter(
      (def) => !tierKnown(productNodes, def.tier, def.tier === 1 && hasTier1Origin)
    ).map((def) => def.label.split(" · ")[1] || def.label);
    const missingEvidence =
      productIssues[0]?.title ||
      (missingTierLabels.length ? `Missing ${missingTierLabels[0]}` : "No gaps recorded");

    const missingStages = computeMissingStagesForProduct(product.id, product.passport_state, traceCtx);
    productRows.push({
      id: product.id,
      name: product.name,
      sku: product.sku,
      styleCode: product.style_code,
      category: cat,
      imageUrl: null,
      completenessPct,
      countryPath,
      missingEvidence,
      status: productStatus(completenessPct),
      href: `${base}/products/${product.id}?tab=traceability`,
      missingStages,
    });
  }

  const pct = (n: number) => (count ? Math.round((n / count) * 100) : 0);
  const stages: TraceabilityStageStat[] = [
    { id: "raw_material", label: "Raw Material", pct: pct(stageCounts.raw_material) },
    { id: "processing", label: "Processing", pct: pct(stageCounts.processing) },
    { id: "fabric_mill", label: "Fabric Mill", pct: pct(stageCounts.fabric_mill) },
    { id: "garment_assembly", label: "Garment Assembly", pct: pct(stageCounts.garment_assembly) },
    { id: "product", label: "Product", pct: pct(stageCounts.product) },
    { id: "passport", label: "Passport", pct: pct(stageCounts.passport) },
  ].map((stage) => ({
    ...stage,
    tone: stageTone(stage.pct),
    status: stageStatus(stage.pct),
  }));

  const gapMap = new Map<string, { label: string; count: number; issueType: string | null }>();
  for (const issue of openIssues) {
    const label = issue.title?.trim() || "Open traceability issue";
    const key = label.toLowerCase();
    const bucket = gapMap.get(key) || { label, count: 0, issueType: issue.issue_type || null };
    bucket.count += 1;
    gapMap.set(key, bucket);
  }

  const traceabilityKeywords = /certificate|tier|supplier|spinner|dye|mill|origin|evidence|trace|recycl|test report/i;
  const priorityGaps: TraceabilityPriorityGap[] = Array.from(gapMap.values())
    .filter((row) => traceabilityKeywords.test(row.label) || row.issueType === "evidence" || row.issueType === "supplier")
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((row, index) => ({
      id: `gap-${index}`,
      label: row.label,
      count: row.count,
      issueType: row.issueType,
      href: row.issueType
        ? `${base}/issues?issueType=${encodeURIComponent(row.issueType)}`
        : `${base}/issues`,
    }));

  if (priorityGaps.length === 0 && count > 0) {
    for (const stage of stages.filter((s) => s.tone === "attention" || s.pct < 70).slice(0, 3)) {
      priorityGaps.push({
        id: `stage-${stage.id}`,
        label: `Incomplete ${stage.label.toLowerCase()}`,
        count: count - Math.round((stage.pct / 100) * count),
        issueType: "missing_data",
        href: `${base}/products?focus=${stage.id}`,
      });
    }
  }

  const categories: TraceabilityCategoryStat[] = Array.from(categoryStats.entries())
    .map(([category, stats]) => ({
      category,
      pct: Math.round(stats.sum / stats.count),
      productCount: stats.count,
    }))
    .sort((a, b) => b.pct - a.pct);

  const passportsLinked = publishedPassportProducts.size || passportProducts.size;

  return {
    summary: {
      ...summary,
      passportsLinked,
      passportsLinkedPct: pct(passportsLinked),
      completenessTrend:
        priorAvgCompleteness != null && count > 0
          ? Math.round(
              productRows.reduce((sum, row) => sum + row.completenessPct, 0) / Math.max(count, 1) -
                priorAvgCompleteness
            )
          : null,
    },
    stages,
    sourcing: {
      countries: Array.from(countryProductCounts.entries())
        .map(([code, productCount]) => ({
          code,
          label: COUNTRY_LABELS[code] || code,
          productCount,
        }))
        .sort((a, b) => b.productCount - a.productCount),
      supplierCount: (suppliers || []).length,
      productsMapped: count ? Array.from(countryProductCounts.keys()).length : 0,
    },
    categories,
    priorityGaps,
    products: productRows,
  };
}
