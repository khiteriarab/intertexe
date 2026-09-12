import { getConsumerSiteUrl } from "../platform-urls";

/** Customer Zero live case study — scan this QR in a sales conversation. */
export const PASSPORT_CASE_STUDY = {
  styleCode: "ITX-LIVE-01",
  sku: "P01152404-3",
  publicId: "itx_4p2h31174z5e4f6n6f1a",
  productName: "God's True Cashmere Brilliant Linen Shirt with Lapis Lazuli",
  brand: "God's True Cashmere",
  composition: "100% Linen",
  imageUrl:
    "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/33/P01152404.jpg",
  template: "Editorial" as const,
  /** Governed lifecycle stages seeded for this product (mirrors obelisk-core). */
  lifecycleStages: [
    { stage: "Raw material", detail: "Flax cultivation", location: "France" },
    { stage: "Processing", detail: "Linen scutching & hackling", location: "France" },
    { stage: "Fabric", detail: "Woven linen mill", location: "Italy" },
    { stage: "Manufacturing", detail: "Shirt assembly · Atelier Norte", location: "Portugal" },
    { stage: "Product", detail: "Brilliant Linen Shirt with Lapis Lazuli", location: "" },
    { stage: "Distribution", detail: "European distribution", location: "" },
    { stage: "Sale", detail: "Flagship retail", location: "Barcelona" },
    { stage: "Ownership", detail: "Cold wash · Line dry · Iron low heat", location: "" },
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
    facility_name: "Flax cultivation",
    country_code: "FR",
    data_status: "provided" as const,
  },
  {
    tier: 3,
    tier_label: "Processing",
    facility_name: "Linen scutching & hackling",
    country_code: "FR",
    data_status: "provided" as const,
  },
  {
    tier: 2,
    tier_label: "Fabric",
    facility_name: "Woven linen mill",
    country_code: "IT",
    data_status: "provided" as const,
  },
  {
    tier: 1,
    tier_label: "Manufacturing",
    facility_name: "Shirt assembly · Atelier Norte",
    country_code: "PT",
    data_status: "provided" as const,
  },
] as const;

export const CASE_STUDY_PUBLIC_FIELDS = {
  manufacturer: "Atelier Norte",
  care_instructions: "Cold wash · Line dry · Iron low heat · Professional repair available",
  distribution: "European distribution",
  retail_market: "Barcelona",
} as const;
