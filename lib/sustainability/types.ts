import type { ResaleValuation } from "../resale/types";

export type VerificationStatus = "verified" | "declared" | "estimated" | "missing" | "not_applicable";

export type TraceabilityStageStatus = "verified" | "partial" | "missing";

export type TraceabilityStage = {
  id: string;
  label: string;
  status: TraceabilityStageStatus;
  detail?: string | null;
};

export type ProductTraceabilityScore = {
  completionPercentage: number;
  score: number;
  verifiedStages: TraceabilityStage[];
  unverifiedStages: TraceabilityStage[];
  facilities: Array<{ name: string | null; country: string | null; tier: number }>;
  countries: string[];
  certificateCount: number;
  supplyChainRecordCount: number;
  evidenceCount: number;
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
  methodology: "intertexe_traceability_v1";
};

export type EnvironmentalMetric = {
  value: number | null;
  unit: string | null;
  status: VerificationStatus;
  methodology?: string | null;
  methodologyVersion?: string | null;
  calculatedAt?: string | null;
  source?: string | null;
};

export type ProductEnvironmentalImpact = {
  carbonFootprint: EnvironmentalMetric | null;
  waterImpact: EnvironmentalMetric | null;
  biodiversityImpact: EnvironmentalMetric | null;
  resourceUse: EnvironmentalMetric | null;
  durability: { level: "low" | "medium" | "high" | null; basis: string | null };
  methodology: string | null;
  methodologyVersion: string | null;
  calculatedAt: string | null;
  verificationStatus: VerificationStatus;
};

export type FranceEnvironmentalCost = {
  jurisdiction: "FR";
  totalImpactPoints: number;
  pointsPer100g: number | null;
  methodology: "ecobalyse";
  methodologyVersion: string;
  calculatedAt: string | null;
  declaredAt: string | null;
  source: string | null;
  verificationStatus: VerificationStatus;
};

export type RegulatoryScores = {
  franceEnvironmentalCost: FranceEnvironmentalCost | null;
  regimes: Array<{ jurisdiction: string; regime: string; status: VerificationStatus }>;
};

export type ProductCircularity = {
  repairable: boolean | null;
  recyclable: boolean | null;
  resaleEligible: boolean;
  estimatedResaleValue: number | null;
  valueRetentionPct: number | null;
  ownershipCount: number;
  currency: string | null;
};

export type SustainabilityDimension = {
  id: string;
  label: string;
  result: string;
  status: "known" | "partial" | "unavailable";
};

export type ConsumerSustainabilityProfile = {
  dimensions: SustainabilityDimension[];
};

export type IntertexeProductPassport = {
  product: {
    publicId: string;
    name: string;
    brand: string | null;
    category: string | null;
    identifier: string | null;
    imageUrl: string | null;
    passportStatus: string;
  };
  materials: {
    composition: string | null;
    breakdown: Array<{ fiber: string; pct: number | null }>;
    naturalFiberShare: number | null;
  };
  supplyChain: {
    manufacturingCountry: string | null;
    manufacturer: string | null;
    facility: string | null;
    journeyStages: Array<{ id: string; title: string; location: string | null }>;
  };
  manufacturing: {
    countries: string[];
    facilities: Array<{ name: string | null; country: string | null; tier: number }>;
  };
  traceability: ProductTraceabilityScore;
  certifications: Array<{ name: string; status: VerificationStatus }>;
  environmentalImpact: ProductEnvironmentalImpact;
  regulatoryScores: RegulatoryScores;
  circularity: ProductCircularity;
  resale: {
    eligible: boolean;
    intelligence: ResaleValuation | null;
    sellUrl: string | null;
  };
  lifecycle: {
    events: Array<{ year: number | null; label: string; detail?: string | null }>;
    timeline: Array<{ label: string; date: string | null }>;
  };
  sustainabilityProfile: ConsumerSustainabilityProfile;
};

export type BrandSustainabilityAnalytics = {
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

export type ImpactInputRow = {
  metric_key: string;
  metric_label?: string | null;
  value?: number | null;
  unit?: string | null;
  data_status?: string | null;
  methodology?: string | null;
  notes?: string | null;
  updated_at?: string | null;
};

export type RegulatoryScoreRow = {
  jurisdiction: string;
  regime: string;
  total_points?: number | null;
  points_per_100g?: number | null;
  methodology?: string | null;
  methodology_version?: string | null;
  calculated_at?: string | null;
  declared_at?: string | null;
  source?: string | null;
  verification_status?: string | null;
};
