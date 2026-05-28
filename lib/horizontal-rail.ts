/** Shared classes for homepage / catalog horizontal scroll rails (touch + snap). */
export const HORIZONTAL_RAIL_CLASS =
  "horizontal-rail product-rail-scroll flex overflow-x-auto scrollbar-hide w-full max-w-none gap-4 pb-4 snap-x snap-mandatory";

export const HORIZONTAL_RAIL_INSET_CLASS =
  `${HORIZONTAL_RAIL_CLASS} -mx-4 px-4 md:-mx-8 md:px-8`;

/** Full viewport width on large screens — no max-width on the scroll track. */
export const HORIZONTAL_RAIL_BLEED_CLASS =
  `${HORIZONTAL_RAIL_CLASS} px-4 md:px-8`;

export const HORIZONTAL_RAIL_BLEED_WRAPPER_CLASS = "w-full max-w-none lg:layout-bleed-full";

export const HORIZONTAL_RAIL_PRODUCT_CARD_CLASS =
  "flex-shrink-0 w-[160px] sm:w-[200px] snap-start";

export const HORIZONTAL_RAIL_COLLECTION_TILE_CLASS =
  "flex-shrink-0 w-[280px] sm:w-[320px] snap-start";
