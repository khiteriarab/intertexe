import type { SustainabilityProviderAdapter } from "./types";

/** Green Story connector shell — LCA, carbon, PEF, French environmental cost. */
export const greenStoryProvider: SustainabilityProviderAdapter = {
  id: "green_story",
  label: "Green Story",
  description: "LCA, carbon footprint, PEF-aligned results, and French environmental scoring.",
  integrationCategory: "Sustainability",
  priority: "primary",
  capabilities: {
    productCarbonFootprint: true,
    productLca: true,
    higgMsi: false,
    higgProductModule: false,
    facilityEnvironmental: false,
    frenchEnvironmentalCost: true,
    pefAligned: true,
    hotspotData: true,
    lifecycleInventory: false,
  },
  sourceAttribution(methodology = "Product LCA") {
    return `Source: Green Story / ${methodology}`;
  },
  async fetchProductImpact(context) {
    if (!context.credentials?.apiKey && !context.externalRecordId) return null;
    return null;
  },
};

export const GREEN_STORY_INTEGRATION_CARD = {
  id: "green-story",
  label: "Green Story",
  category: "Sustainability",
  detail: "LCA, carbon and regulatory environmental scoring",
  connectLabel: "Connect",
  capabilities: ["Product carbon footprint", "PEF-aligned LCA", "French Coût Environnemental", "Hotspot data"],
} as const;
