import { NextResponse } from "next/server";
import {
  SHOP_CATEGORY_OPTIONS,
  SHOP_COLOR_OPTIONS,
  SHOP_FILTER_SECTION_ORDER,
  SHOP_PRICE_TIERS,
  SHOP_SHOE_TYPES,
  fiberOptionsForCategory,
} from "../../../../lib/catalog-filter-options";
import { CATEGORY_SUBCATEGORY_OPTIONS } from "../../../../lib/catalog-subcategories";

export const revalidate = 3600;

/** Canonical filter sheet for web + iOS UnifiedFilterSheet. */
export async function GET() {
  return NextResponse.json({
    version: 2,
    sectionOrder: SHOP_FILTER_SECTION_ORDER,
    categories: SHOP_CATEGORY_OPTIONS,
    shoeTypes: SHOP_SHOE_TYPES,
    stylesByCategory: CATEGORY_SUBCATEGORY_OPTIONS,
    apparelFibers: fiberOptionsForCategory(null).filter((o) => o.key !== "all"),
    shoeFibers: fiberOptionsForCategory("shoes").filter((o) => o.key !== "all"),
    colors: SHOP_COLOR_OPTIONS,
    priceTiers: SHOP_PRICE_TIERS.map((tier) => ({ id: tier.id, label: tier.label })),
    notes: {
      colorAbovePrice: true,
      shoes:
        "Selecting Shoes opens /shop/shoes (and /api/shop?category=shoes) with shoe type, then leather/suede/nubuck/canvas. Type aliases: type, shoeType, subcategory. Material aliases: material, fiber, materialSubtype.",
      shoesPath: "/shop/shoes",
      shoesApi: "/api/shop?category=shoes&type=Sandals&material=suede",
    },
  });
}
