/**
 * NAP-style homepage merchandising manifest — single editorial feed contract.
 * Web homepage, /api/homepage, /api/editorial-config, and iOS read this shape.
 */
import { COLLECTIONS_MENU } from "./collections-manifest";
import { CURATED_BRAND_SLUGS } from "./homepage-constants";
import { MERCH_RAIL_KEYS, type MerchRailKey } from "./merch-feed";

export type HomepageSectionId =
  | "new_in"
  | "brands_we_love"
  | "collections"
  | "material_rails"
  | "sale";

export type HomepageMerchandisingRail = {
  id: string;
  railKey: MerchRailKey;
  title: string;
  subtitle?: string;
  href?: string;
  displayLimit: number;
  fetchLimit: number;
};

export const HOMEPAGE_MERCH_VERSION = 2;

/** Section order on homepage (NAP editorial sequence). */
export const HOMEPAGE_SECTION_ORDER: HomepageSectionId[] = [
  "new_in",
  "brands_we_love",
  "collections",
  "material_rails",
  "sale",
];

export const NEW_IN_BRAND_SLUGS = [
  "frame",
  "vince",
  "theory",
  "toteme",
  "ganni",
  "staud",
  "khaite",
  "isabel-marant",
] as const;

export const HOMEPAGE_LIMITS = {
  newInFetchPerBrand: 14,
  newInTargetItems: 28,
  newInFetchLimit: 56,
  newInDisplayLimit: 28,
  saleFetchLimit: 96,
  saleDisplayLimit: 28,
  materialRailFetchLimit: 64,
  materialRailDisplayMax: 50,
  materialDiversityMaxPerBrand: 2,
  brandLiveRowCap: 24,
  designersFetchLimit: 48,
} as const;

const MATERIAL_RAILS: HomepageMerchandisingRail[] = [
  {
    id: "silk",
    railKey: MERCH_RAIL_KEYS.silk,
    title: "Silk",
    href: "/silk-clothing",
    displayLimit: 12,
    fetchLimit: HOMEPAGE_LIMITS.materialRailFetchLimit,
  },
  {
    id: "linen",
    railKey: MERCH_RAIL_KEYS.linen,
    title: "Linen",
    href: "/linen-clothing",
    displayLimit: 12,
    fetchLimit: HOMEPAGE_LIMITS.materialRailFetchLimit,
  },
  {
    id: "cashmere",
    railKey: MERCH_RAIL_KEYS.cashmere,
    title: "Cashmere",
    href: "/cashmere-clothing",
    displayLimit: 12,
    fetchLimit: HOMEPAGE_LIMITS.materialRailFetchLimit,
  },
  {
    id: "wool",
    railKey: MERCH_RAIL_KEYS.wool,
    title: "Wool",
    href: "/materials/wool",
    displayLimit: 12,
    fetchLimit: HOMEPAGE_LIMITS.materialRailFetchLimit,
  },
  {
    id: "cotton",
    railKey: MERCH_RAIL_KEYS.cotton,
    title: "Cotton",
    href: "/cotton-clothing",
    displayLimit: 12,
    fetchLimit: HOMEPAGE_LIMITS.materialRailFetchLimit,
  },
];

const COLLECTION_RAILS: HomepageMerchandisingRail[] = [
  {
    id: "vacation",
    railKey: MERCH_RAIL_KEYS.vacation,
    title: "Vacation Shop",
    href: "/collections/vacation",
    displayLimit: 10,
    fetchLimit: 24,
  },
  {
    id: "evening",
    railKey: MERCH_RAIL_KEYS.evening,
    title: "Evening",
    href: "/collections/evening",
    displayLimit: 10,
    fetchLimit: 24,
  },
  {
    id: "tailoring",
    railKey: MERCH_RAIL_KEYS.tailoring,
    title: "Tailoring",
    href: "/collections/tailoring",
    displayLimit: 10,
    fetchLimit: 24,
  },
  {
    id: "summer-in-the-city",
    railKey: MERCH_RAIL_KEYS.summerInCity,
    title: "Summer in the City",
    href: "/collections/summer-in-the-city",
    displayLimit: 10,
    fetchLimit: 24,
  },
  {
    id: "white-edit",
    railKey: MERCH_RAIL_KEYS.whiteEdit,
    title: "The White Edit",
    href: "/collections/white-edit",
    displayLimit: 10,
    fetchLimit: 24,
  },
];

/** Serializable manifest for API clients (iOS + web). */
export function buildHomepageMerchandisingManifest() {
  return {
    version: HOMEPAGE_MERCH_VERSION,
    sectionOrder: [...HOMEPAGE_SECTION_ORDER],
    newIn: {
      brandSlugs: [...NEW_IN_BRAND_SLUGS],
      ...HOMEPAGE_LIMITS,
      railKey: MERCH_RAIL_KEYS.newIn,
      title: "New In",
      href: "/shop?sort=new",
    },
    brandsWeLove: {
      brandSlugs: [...CURATED_BRAND_SLUGS],
      title: "Brands We Love",
      railKey: MERCH_RAIL_KEYS.designersCurated,
    },
    collectionsMenu: COLLECTIONS_MENU,
    collectionRails: COLLECTION_RAILS,
    materialRails: MATERIAL_RAILS,
    sale: {
      railKey: MERCH_RAIL_KEYS.sale,
      title: "Sale",
      href: "/sale",
      displayLimit: HOMEPAGE_LIMITS.saleDisplayLimit,
      fetchLimit: HOMEPAGE_LIMITS.saleFetchLimit,
    },
  };
}
