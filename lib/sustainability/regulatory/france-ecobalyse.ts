import type { FranceEnvironmentalCost, RegulatoryScoreRow, RegulatoryScores } from "../types";

export function buildFranceEnvironmentalCost(row: RegulatoryScoreRow | null): FranceEnvironmentalCost | null {
  if (!row || row.total_points == null) return null;
  return {
    jurisdiction: "FR",
    totalImpactPoints: Number(row.total_points),
    pointsPer100g: row.points_per_100g != null ? Number(row.points_per_100g) : null,
    methodology: "ecobalyse",
    methodologyVersion: row.methodology_version || "7.0",
    calculatedAt: row.calculated_at || null,
    declaredAt: row.declared_at || null,
    source: row.source || null,
    verificationStatus: (row.verification_status as FranceEnvironmentalCost["verificationStatus"]) || "declared",
  };
}

export function buildRegulatoryScores(rows: RegulatoryScoreRow[]): RegulatoryScores {
  const france = rows.find((r) => r.jurisdiction === "FR" && r.regime === "ecobalyse") || null;
  return {
    franceEnvironmentalCost: buildFranceEnvironmentalCost(france),
    regimes: rows.map((r) => ({
      jurisdiction: r.jurisdiction,
      regime: r.regime,
      status: (r.verification_status as RegulatoryScores["regimes"][0]["status"]) || "declared",
    })),
  };
}
