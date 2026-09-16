import type { SupabaseClient } from "@supabase/supabase-js";
import { loadOrgOverview } from "../enterprise/queries";
import { providerAttribution } from "./providers";
import { loadAllProductImpacts } from "./product-impact";
import {
  loadProviderConnections,
  loadStoredFacilities,
  loadStoredMaterials,
} from "./store";
import type {
  ImpactHotspot,
  OrgImpactOverview,
  ProductImpactSummaryRow,
  SustainabilityScore,
} from "./types";

export type ImpactTabData = {
  overview: OrgImpactOverview;
  products: ProductImpactSummaryRow[];
  materials: Awaited<ReturnType<typeof loadStoredMaterials>>;
  facilities: Awaited<ReturnType<typeof loadStoredFacilities>>;
  scores: Array<SustainabilityScore & { productId: string; productName: string }>;
  evidenceRows: Array<{
    productId: string;
    productName: string;
    verified: number;
    required: number;
    provider: string;
    lastCalculatedAt: string | null;
  }>;
};

function aggregateHotspots(records: Awaited<ReturnType<typeof loadAllProductImpacts>>): ImpactHotspot[] {
  const totals = new Map<string, { sharePct: number; count: number }>();
  for (const record of records) {
    for (const hotspot of record.hotspots || []) {
      const row = totals.get(hotspot.stage) || { sharePct: 0, count: 0 };
      row.sharePct += hotspot.sharePct;
      row.count += 1;
      totals.set(hotspot.stage, row);
    }
  }
  return Array.from(totals.entries())
    .map(([stage, { sharePct, count }]) => ({ stage, sharePct: Math.round(sharePct / count) }))
    .sort((a, b) => b.sharePct - a.sharePct)
    .slice(0, 5);
}

function avgCarbon(records: Awaited<ReturnType<typeof loadAllProductImpacts>>) {
  const values = records
    .map((r) => r.environmentalImpact.carbon?.value)
    .filter((v): v is number => typeof v === "number");
  if (!values.length) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { value: Math.round(avg * 10) / 10, unit: records[0]?.environmentalImpact.carbon?.unit || "kg CO2e" };
}

export async function loadOrgImpactDashboard(
  client: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<ImpactTabData> {
  const [overview, connections, impactRecords, materials, facilities, { data: products }] = await Promise.all([
    loadOrgOverview(client, organizationId),
    loadProviderConnections(client, organizationId, slug),
    loadAllProductImpacts(client, organizationId, slug),
    loadStoredMaterials(slug),
    loadStoredFacilities(slug),
    client
      .from("products")
      .select("id, name, sku, style_code, category")
      .eq("organization_id", organizationId)
      .eq("lifecycle", "active"),
  ]);

  const productById = new Map((products || []).map((p) => [p.id, p]));
  const impactByProductId = new Map(impactRecords.map((r) => [r.productId, r]));

  const frenchScore = impactRecords
    .flatMap((r) => r.sustainabilityScores)
    .find((s) => s.type === "french_environmental_cost");

  const primaryAssessment = impactRecords.flatMap((r) => r.impactAssessments)[0] || null;
  const measuredShares = impactRecords.flatMap((r) => r.impactAssessments.map((a) => a.measuredShare));
  const estimatedShares = impactRecords.flatMap((r) => r.impactAssessments.map((a) => a.estimatedShare));
  const avgMeasured = measuredShares.length
    ? Math.round(measuredShares.reduce((a, b) => a + b, 0) / measuredShares.length)
    : null;
  const avgEstimated = estimatedShares.length
    ? Math.round(estimatedShares.reduce((a, b) => a + b, 0) / estimatedShares.length)
    : null;

  const evidenceVerified = impactRecords.reduce((sum, r) => sum + (r.evidenceStatus?.verified || 0), 0);
  const evidenceRequired = impactRecords.reduce((sum, r) => sum + (r.evidenceStatus?.required || 0), 0);

  const orgOverview: OrgImpactOverview = {
    productFootprint: avgCarbon(impactRecords),
    environmentalScore: frenchScore
      ? {
          label: frenchScore.label || "French Coût Environnemental",
          value: frenchScore.value,
          unit: frenchScore.unit,
          provider: frenchScore.provider as "green_story",
          market: frenchScore.market,
        }
      : null,
    primaryDataCoveragePct: avgMeasured,
    hotspots: aggregateHotspots(impactRecords),
    evidenceStatus: { verified: evidenceVerified, required: evidenceRequired || overview.productCount * 8 },
    sourceAttribution: primaryAssessment
      ? providerAttribution(primaryAssessment.provider, primaryAssessment.methodology)
      : null,
    methodology: primaryAssessment?.methodology || null,
    methodologyVersion: primaryAssessment?.methodologyVersion || null,
    lastCalculatedAt: primaryAssessment?.calculatedAt || null,
    measuredShare: avgMeasured,
    estimatedShare: avgEstimated,
    productsWithImpact: impactRecords.length,
    productCount: overview.productCount,
    providerConnections: connections,
  };

  const productRows: ProductImpactSummaryRow[] = (products || []).map((product) => {
    const impact = impactByProductId.get(product.id);
    const assessment = impact?.impactAssessments[0];
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      carbon: impact?.environmentalImpact.carbon || null,
      primaryScore: impact?.sustainabilityScores[0] || null,
      measuredShare: assessment?.measuredShare ?? null,
      provider: assessment?.provider ?? null,
      lastCalculatedAt: assessment?.calculatedAt ?? null,
    };
  });

  const scores = impactRecords.flatMap((record) => {
    const product = productById.get(record.productId);
    return record.sustainabilityScores.map((score) => ({
      ...score,
      productId: record.productId,
      productName: product?.name || "Product",
    }));
  });

  const evidenceRows = impactRecords.map((record) => {
    const product = productById.get(record.productId);
    const assessment = record.impactAssessments[0];
    return {
      productId: record.productId,
      productName: product?.name || "Product",
      verified: record.evidenceStatus?.verified || 0,
      required: record.evidenceStatus?.required || 0,
      provider: assessment ? providerAttribution(assessment.provider, assessment.methodology) : "—",
      lastCalculatedAt: assessment?.calculatedAt ?? null,
    };
  });

  return {
    overview: orgOverview,
    products: productRows,
    materials,
    facilities,
    scores,
    evidenceRows,
  };
}
