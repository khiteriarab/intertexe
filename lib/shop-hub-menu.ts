/**
 * Shop hub menu — parity with iOS `ShopHomeView` menuRows.
 * Used by the mobile bottom-dock Shop tab.
 */
export const SHOP_HUB_MENU = [
  { name: "Clothing", href: "/shop" },
  { name: "Shoes", href: "/shop/shoes" },
  { name: "Collections", href: "/collections" },
  { name: "Designers", href: "/designers" },
  { name: "Fabrics", href: "/materials" },
  { name: "Style Quiz", href: "/quiz" },
  { name: "Sale", href: "/sale" },
] as const;
