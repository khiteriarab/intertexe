import type { SustainabilityProviderAdapter } from "./types";

export const worldlyProvider: SustainabilityProviderAdapter = {
  id: "worldly",
  label: "Worldly / Higg",
  description: "Material and product impact from Higg MSI, Product Module, and facility environmental data.",
  integrationCategory: "Sustainability",
  priority: "primary",
  capabilities: {
    productCarbonFootprint: true,
    productLca: false,
    higgMsi: true,
    higgProductModule: true,
    facilityEnvironmental: true,
    frenchEnvironmentalCost: false,
    pefAligned: false,
    hotspotData: true,
    lifecycleInventory: false,
  },
  sourceAttribution(methodology = "Higg MSI") {
    return `Source: Worldly / ${methodology}`;
  },
  async fetchProductImpact(context) {
    if (!context.credentials?.apiKey && !context.externalRecordId) return null;
    return null;
  },
};

export const WORLDLY_INTEGRATION_CARD = {
  id: "worldly-higg",
  label: "Worldly / Higg",
  category: "Sustainability",
  detail: "Material and product impact",
  connectLabel: "Connect",
  capabilities: ["Higg MSI", "Higg Product Module", "Facility environmental data"],
} as const;
