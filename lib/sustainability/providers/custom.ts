import type { SustainabilityProviderAdapter } from "./types";

/** Custom provider for brand-supplied or partner-ingested impact data. */
export const customProvider: SustainabilityProviderAdapter = {
  id: "custom",
  label: "Custom provider",
  description: "Brand-supplied or partner-ingested sustainability outputs mapped to INTERTEXE products.",
  integrationCategory: "Sustainability",
  priority: "custom",
  capabilities: {
    productCarbonFootprint: true,
    productLca: true,
    higgMsi: false,
    higgProductModule: false,
    facilityEnvironmental: true,
    frenchEnvironmentalCost: true,
    pefAligned: true,
    hotspotData: true,
    lifecycleInventory: true,
  },
  sourceAttribution(methodology = "Custom") {
    return `Source: Custom / ${methodology}`;
  },
  async fetchProductImpact(context) {
    if (!context.externalRecordId) return null;
    return null;
  },
};
