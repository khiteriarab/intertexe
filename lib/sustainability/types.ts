/** Provider-agnostic sustainability types — normalized against governed INTERTEXE product records. */

export type SustainabilityProviderId = "worldly" | "green_story" | "ecoinvent" | "custom";

export type ImpactMetricValue = {
  value: number;
  unit: string;
};

export type EnvironmentalImpact = {
  carbon?: ImpactMetricValue | null;
  water?: ImpactMetricValue | null;
  energy?: ImpactMetricValue | null;
  landUse?: ImpactMetricValue | null;
  resourceUse?: ImpactMetricValue | null;
};

export type ImpactAssessment = {
  provider: SustainabilityProviderId;
  methodology: string;
  methodologyVersion: string;
  score: number;
  unit: string;
  scope: string;
  measuredShare: number;
  estimatedShare: number;
  confidence: number;
  calculatedAt: string;
  sourceReference: string;
  externalRecordId?: string | null;
};

export type SustainabilityScoreType =
  | "french_environmental_cost"
  | "higg_msi"
  | "product_carbon"
  | "intertexe_traceability"
  | "custom";

export type SustainabilityScoreStatus = "verified" | "estimated" | "incomplete";

export type SustainabilityScore = {
  type: SustainabilityScoreType;
  provider: SustainabilityProviderId | "intertexe";
  value: number;
  unit: string;
  market?: string | null;
  methodologyVersion?: string | null;
  status: SustainabilityScoreStatus;
  label?: string;
};

export type ImpactHotspot = {
  stage: string;
  sharePct: number;
  provider?: SustainabilityProviderId;
};

export type ImpactEvidenceStatus = {
  verified: number;
  required: number;
};

export type ProductImpactRecord = {
  productId: string;
  environmentalImpact: EnvironmentalImpact;
  impactAssessments: ImpactAssessment[];
  sustainabilityScores: SustainabilityScore[];
  hotspots?: ImpactHotspot[];
  evidenceStatus?: ImpactEvidenceStatus;
};

export type ProductTraceabilityScore = {
  score: number;
  supplyChainRecordCount: number;
  certificateCount: number;
  verifiedStages: Array<{ id: string; label: string; detail?: string | null }>;
  unverifiedStages: Array<{ id: string; label: string; status: string }>;
};

export type RegulatoryScores = {
  franceEnvironmentalCost?: {
    totalImpactPoints: number;
    pointsPer100g?: number;
    methodology: string;
    methodologyVersion: string;
    verificationStatus: string;
    provider?: SustainabilityProviderId;
  };
};

export type ProductEnvironmentalImpact = EnvironmentalImpact & {
  primaryDataCoveragePct?: number;
  lastCalculatedAt?: string | null;
  primaryProvider?: SustainabilityProviderId | null;
};

export type ConsumerSustainabilityProfile = {
  dimensions: Array<{
    id: "repairability" | "circularity" | "resale_value";
    label: string;
    result: string;
  }>;
};

export type ProductCircularity = {
  repairabilityScore?: number | null;
  recyclabilityNotes?: string | null;
  endOfLifeGuidance?: string | null;
};

export type ProviderConnectionState = "disconnected" | "connecting" | "connected" | "error";

export type SustainabilityProviderConnection = {
  providerId: SustainabilityProviderId;
  label: string;
  connectionState: ProviderConnectionState;
  credentialsConfigured: boolean;
  lastSyncAt?: string | null;
  externalAccountId?: string | null;
};

export type OrgImpactOverview = {
  productFootprint: ImpactMetricValue | null;
  environmentalScore: {
    label: string;
    value: number;
    unit: string;
    provider: SustainabilityProviderId;
    market?: string | null;
  } | null;
  primaryDataCoveragePct: number | null;
  hotspots: ImpactHotspot[];
  evidenceStatus: ImpactEvidenceStatus;
  sourceAttribution: string | null;
  methodology: string | null;
  methodologyVersion: string | null;
  lastCalculatedAt: string | null;
  measuredShare: number | null;
  estimatedShare: number | null;
  productsWithImpact: number;
  productCount: number;
  providerConnections: SustainabilityProviderConnection[];
};

export type FacilityImpactRow = {
  id: string;
  name: string;
  countryCode: string | null;
  provider: SustainabilityProviderId;
  carbon?: ImpactMetricValue | null;
  water?: ImpactMetricValue | null;
  energy?: ImpactMetricValue | null;
  lastSyncAt: string | null;
  externalRecordId?: string | null;
};

export type MaterialImpactRow = {
  material: string;
  productCount: number;
  avgCarbon?: ImpactMetricValue | null;
  provider: SustainabilityProviderId;
  measuredShare: number;
};

export type ProductImpactSummaryRow = {
  productId: string;
  name: string;
  sku: string | null;
  category: string | null;
  imageUrl?: string | null;
  carbon?: ImpactMetricValue | null;
  primaryScore?: SustainabilityScore | null;
  measuredShare: number | null;
  provider: SustainabilityProviderId | null;
  lastCalculatedAt: string | null;
};

/** Organization-scoped sustainability rollup (SaaS customer — not a consumer fashion brand). */
export type OrganizationSustainabilityAnalytics = {
  productCount: number;
  fullyTraceablePct: number;
  avgTraceabilityScore: number;
  avgEnvironmentalCostPoints: number | null;
  certifiedSupplyChainPct: number;
  repairablePct: number;
  resaleEligiblePct: number;
  supplyChainDisclosurePct: number;
  naturalMaterialsPct: number;
  avgCarbonKg: number | null;
};

/** @deprecated Prefer OrganizationSustainabilityAnalytics */
export type BrandSustainabilityAnalytics = OrganizationSustainabilityAnalytics;
