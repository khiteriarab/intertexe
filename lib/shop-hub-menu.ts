/**
 * Shop hub menu — parity with iOS `ShopHomeView` menuRows.
 * Taxonomy category menus gated by CATALOG_TAXONOMY_NAV (default off).
 */
import { isCatalogTaxonomyNavEnabled } from "./catalog-taxonomy-flags";

const LEGACY_HUB = [
  { name: "Clothing", href: "/shop" },
  { name: "Shoes", href: "/shop/shoes" },
  { name: "Collections", href: "/collections" },
  { name: "Designers", href: "/designers" },
  { name: "Fabrics", href: "/materials" },
  { name: "Style Quiz", href: "/quiz" },
  { name: "Sale", href: "/sale" },
] as const;

const TAXONOMY_HUB = [
  { name: "Clothing", href: "/shop/clothing" },
  { name: "Shoes", href: "/shop/shoes" },
  { name: "Collections", href: "/collections" },
  { name: "Designers", href: "/designers" },
  { name: "Fabrics", href: "/materials" },
  { name: "Style Quiz", href: "/quiz" },
  { name: "Sale", href: "/sale" },
] as const;

export function getShopHubMenu() {
  return isCatalogTaxonomyNavEnabled() ? TAXONOMY_HUB : LEGACY_HUB;
}

/** @deprecated Use getShopHubMenu() — kept for static analysis; respects runtime flag when called. */
export const SHOP_HUB_MENU = LEGACY_HUB;
