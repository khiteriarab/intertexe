import { getConsumerSiteUrl } from "../platform-urls";

/** Customer Zero live case study — scan this QR in a sales conversation. */
export const PASSPORT_CASE_STUDY = {
  styleCode: "ITX-LIVE-01",
  sku: "ITX-4102",
  publicId: "itx_4p2h31174z5e4f6n6f1a",
  productName: "Silk Evening Dress",
  brand: "INTERTEXE Atelier",
  composition: "92% Silk · 8% Elastane",
  imageUrl: "/platform/hero-silk-dress.png",
  template: "Editorial" as const,
  /** Governed lifecycle stages seeded for this product (mirrors obelisk-core). */
  lifecycleStages: [
    { stage: "Raw material", detail: "Mulberry silk cultivation", location: "Italy" },
    { stage: "Processing", detail: "Silk reeling & spinning", location: "Italy" },
    { stage: "Fabric", detail: "Silk satin weave mill", location: "Italy" },
    { stage: "Manufacturing", detail: "Evening dress assembly · Atelier Norte", location: "Portugal" },
    { stage: "Product", detail: "Silk Evening Dress", location: "" },
    { stage: "Distribution", detail: "European distribution", location: "" },
    { stage: "Sale", detail: "Flagship retail", location: "Barcelona" },
    { stage: "Ownership", detail: "Dry clean only · Store flat · Professional repair available", location: "" },
    { stage: "Next life", detail: "Repair · Resell · Donate · Recycle", location: "" },
  ],
} as const;

export function caseStudyPassportUrl(origin?: string): string {
  const base = (origin || getConsumerSiteUrl()).replace(/\/$/, "");
  return `${base}/p/${PASSPORT_CASE_STUDY.publicId}`;
}

/** Supply chain nodes provisioned for the case study product. */
export const CASE_STUDY_SUPPLY_CHAIN = [
  {
    tier: 4,
    tier_label: "Raw material",
    facility_name: "Mulberry silk cultivation",
    country_code: "IT",
    data_status: "provided" as const,
  },
  {
    tier: 3,
    tier_label: "Processing",
    facility_name: "Silk reeling & spinning",
    country_code: "IT",
    data_status: "provided" as const,
  },
  {
    tier: 2,
    tier_label: "Fabric",
    facility_name: "Silk satin weave mill",
    country_code: "IT",
    data_status: "provided" as const,
  },
  {
    tier: 1,
    tier_label: "Manufacturing",
    facility_name: "Evening dress assembly · Atelier Norte",
    country_code: "PT",
    data_status: "provided" as const,
  },
] as const;

export const CASE_STUDY_PUBLIC_FIELDS = {
  manufacturer: "Atelier Norte",
  care_instructions: "Dry clean only · Store flat · Professional repair available",
  distribution: "European distribution",
  retail_market: "Barcelona",
} as const;
