import type {
  ConsumerSustainabilityProfile,
  ProductCircularity,
  ProductEnvironmentalImpact,
  ProductTraceabilityScore,
  RegulatoryScores,
} from "./types";

function dim(
  id: string,
  label: string,
  result: string | null,
  status: "known" | "partial" | "unavailable" = "known"
): { id: string; label: string; result: string; status: "known" | "partial" | "unavailable" } | null {
  if (!result) return null;
  return { id, label, result, status };
}

export function buildConsumerSustainabilityProfile(input: {
  traceability: ProductTraceabilityScore;
  environmental: ProductEnvironmentalImpact;
  regulatory: RegulatoryScores;
  circularity: ProductCircularity;
  composition: string | null;
  manufacturingCountry: string | null;
}): ConsumerSustainabilityProfile {
  const fr = input.regulatory.franceEnvironmentalCost;
  const carbon = input.environmental.carbonFootprint;
  const water = input.environmental.waterImpact;

  const dimensions = [
    dim("traceability", "Traceability", `${input.traceability.score}% verified`, input.traceability.score >= 70 ? "known" : "partial"),
    dim("materials", "Materials", input.composition || null),
    dim("manufacturing", "Manufacturing", input.manufacturingCountry ? `Fully traced · ${input.manufacturingCountry}` : null, input.manufacturingCountry ? "known" : "unavailable"),
    carbon?.value != null
      ? dim("carbon", "Carbon impact", `${carbon.value} ${carbon.unit || "kg CO₂e"}`, carbon.status === "verified" ? "known" : "partial")
      : null,
    water?.value != null ? dim("water", "Water impact", `${water.value} ${water.unit || ""}`.trim(), "partial") : null,
    fr ? dim("environmental_cost", "Environmental cost", `${fr.totalImpactPoints} impact points (FR)`, fr.verificationStatus === "verified" ? "known" : "partial") : null,
    input.environmental.durability.level
      ? dim("durability", "Durability", input.environmental.durability.level.charAt(0).toUpperCase() + input.environmental.durability.level.slice(1))
      : null,
    input.circularity.repairable != null
      ? dim("repairability", "Repairability", input.circularity.repairable ? "High" : "Limited")
      : null,
    dim(
      "circularity",
      "Circularity",
      input.circularity.resaleEligible ? "Resale eligible" : "Resale blocked",
      input.circularity.resaleEligible ? "known" : "unavailable"
    ),
    input.circularity.estimatedResaleValue != null && input.circularity.currency
      ? dim(
          "resale_value",
          "Estimated resale value",
          `${input.circularity.currency === "EUR" ? "€" : "$"}${input.circularity.estimatedResaleValue}`
        )
      : null,
  ].filter(Boolean) as ConsumerSustainabilityProfile["dimensions"];

  return { dimensions };
}
