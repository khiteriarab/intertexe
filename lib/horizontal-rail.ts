/** Shared classes for homepage / catalog horizontal scroll rails (touch + snap). */
export const HORIZONTAL_RAIL_CLASS =
  "horizontal-rail product-rail-scroll flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory";

export const HORIZONTAL_RAIL_INSET_CLASS =
  `${HORIZONTAL_RAIL_CLASS} -mx-4 px-4 md:-mx-8 md:px-8`;

export const HORIZONTAL_RAIL_BLEED_CLASS =
  `${HORIZONTAL_RAIL_CLASS} w-full px-6 md:px-8`;

export const HORIZONTAL_RAIL_PRODUCT_CARD_CLASS =
  "flex-shrink-0 w-[160px] sm:w-[200px] snap-start";

export const HORIZONTAL_RAIL_COLLECTION_TILE_CLASS =
  "flex-shrink-0 w-[280px] sm:w-[320px] snap-start";
