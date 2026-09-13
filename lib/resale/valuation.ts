import type { ResaleValuation } from "./types";

export type ValuationInput = {
  brand?: string | null;
  category?: string | null;
  composition?: string | null;
  originalRetail?: number | null;
  /** Months since first retail / passport publish */
  ageMonths?: number;
  currency?: string;
};

function naturalFiberShare(composition: string | null | undefined): number {
  if (!composition) return 0.5;
  const lower = composition.toLowerCase();
  if (/100%\s*(linen|wool|cashmere|silk|cotton)/.test(lower)) return 1;
  if (/linen|wool|cashmere|silk/.test(lower)) return 0.85;
  if (/cotton/.test(lower) && !/polyester|polyamide|elastane/.test(lower)) return 0.75;
  if (/polyester|polyamide|acrylic/.test(lower)) return 0.35;
  return 0.55;
}

function categoryRetention(category: string | null | undefined): number {
  const c = (category || "").toLowerCase();
  if (/coat|outerwear|jacket/.test(c)) return 0.58;
  if (/cashmere|wool/.test(c)) return 0.62;
  if (/shirt|blouse|top/.test(c)) return 0.48;
  if (/dress/.test(c)) return 0.45;
  if (/denim|jean/.test(c)) return 0.52;
  return 0.5;
}

/**
 * Heuristic v1 — replace with comparable listings + sold transactions when dataset exists.
 * Never fabricates precision; returns explicit methodology.
 */
export function estimateResaleValue(input: ValuationInput): ResaleValuation {
  const currency = input.currency || "USD";
  const baseRetail = input.originalRetail ?? inferRetailPlaceholder(input.category);
  const ageMonths = Math.max(0, input.ageMonths ?? 12);
  const ageDecay = Math.max(0.32, 1 - ageMonths * 0.015);
  const fiberBoost = 0.85 + naturalFiberShare(input.composition) * 0.2;
  const catRetention = categoryRetention(input.category);
  const retention = Math.min(0.72, catRetention * fiberBoost * ageDecay);
  const estimated = Math.round(baseRetail * retention);
  const spread = Math.max(15, Math.round(estimated * 0.08));

  const demand =
    naturalFiberShare(input.composition) >= 0.8 && ageMonths < 24
      ? "high"
      : ageMonths > 36
        ? "low"
        : "medium";

  const daysMin = demand === "high" ? 11 : demand === "medium" ? 14 : 21;
  const daysMax = demand === "high" ? 18 : demand === "medium" ? 24 : 35;

  return {
    estimatedValue: estimated,
    valueLow: estimated - spread,
    valueHigh: estimated + spread,
    currency,
    originalRetail: input.originalRetail ?? baseRetail,
    valueRetentionPct: Math.round(retention * 1000) / 10,
    marketDemand: demand,
    typicalSellingDaysMin: daysMin,
    typicalSellingDaysMax: daysMax,
    bestChannel: demand === "high" ? "Vestiaire Collective" : "eBay",
    alternativeChannel: demand === "high" ? "eBay" : "Consignment partner",
    methodology: "heuristic_v1",
  };
}

function inferRetailPlaceholder(category: string | null | undefined): number {
  const c = (category || "").toLowerCase();
  if (/coat|outerwear/.test(c)) return 790;
  if (/dress/.test(c)) return 620;
  if (/shirt|blouse/.test(c)) return 320;
  return 450;
}
