import type { SustainabilityProviderAdapter } from "./types";

/** ecoinvent placeholder — advanced lifecycle inventory, no customer UI integration yet. */
export const ecoinventProvider: SustainabilityProviderAdapter = {
  id: "ecoinvent",
  label: "ecoinvent",
  description: "Advanced lifecycle inventory data for internal or partner-led LCA workflows.",
  integrationCategory: "Sustainability",
  priority: "advanced",
  capabilities: {
    productCarbonFootprint: false,
    productLca: true,
    higgMsi: false,
    higgProductModule: false,
    facilityEnvironmental: false,
    frenchEnvironmentalCost: false,
    pefAligned: true,
    hotspotData: false,
    lifecycleInventory: true,
  },
  sourceAttribution(methodology = "ecoinvent LCI") {
    return `Source: ecoinvent / ${methodology}`;
  },
  async fetchProductImpact() {
    return null;
  },
};

export const ECOINVENT_INTEGRATION_CARD = {
  id: "ecoinvent",
  label: "ecoinvent",
  category: "Sustainability",
  detail: "Advanced lifecycle inventory data",
  connectLabel: "Advanced / coming later",
  capabilities: ["Lifecycle inventory datasets", "Methodology versioning"],
} as const;
