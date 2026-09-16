import type {
  EnvironmentalImpact,
  ImpactAssessment,
  ProductImpactRecord,
  SustainabilityProviderId,
  SustainabilityScore,
} from "../types";

export type ProviderFetchContext = {
  organizationId: string;
  productId: string;
  sku?: string | null;
  styleCode?: string | null;
  externalRecordId?: string | null;
  credentials?: Record<string, unknown> | null;
};

export type ProviderFetchResult = {
  environmentalImpact?: EnvironmentalImpact | null;
  impactAssessments?: ImpactAssessment[];
  sustainabilityScores?: SustainabilityScore[];
  externalRecordId?: string | null;
  attributionLabel: string;
};

export type ProviderCapabilities = {
  productCarbonFootprint: boolean;
  productLca: boolean;
  higgMsi: boolean;
  higgProductModule: boolean;
  facilityEnvironmental: boolean;
  frenchEnvironmentalCost: boolean;
  pefAligned: boolean;
  hotspotData: boolean;
  lifecycleInventory: boolean;
};

export interface SustainabilityProviderAdapter {
  id: SustainabilityProviderId;
  label: string;
  description: string;
  integrationCategory: string;
  priority: "primary" | "advanced" | "custom";
  capabilities: ProviderCapabilities;
  fetchProductImpact(context: ProviderFetchContext): Promise<ProviderFetchResult | null>;
  sourceAttribution(methodology?: string): string;
}

export type PartialProductImpact = Pick<
  ProductImpactRecord,
  "environmentalImpact" | "impactAssessments" | "sustainabilityScores" | "hotspots" | "evidenceStatus"
>;
