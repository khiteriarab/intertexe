/** Shared classes for homepage / catalog horizontal scroll rails (touch + snap). */
export const HORIZONTAL_RAIL_CLASS =
  "horizontal-rail product-rail-scroll flex overflow-x-auto scrollbar-hide w-full max-w-none gap-4 pb-4 snap-x snap-mandatory";

/** Softer snap — easier to scroll back on mobile / in-app browsers (Instagram, etc.). */
export const HORIZONTAL_RAIL_PROXIMITY_CLASS =
  "horizontal-rail product-rail-scroll flex overflow-x-auto scrollbar-hide w-full max-w-none gap-4 pb-4 snap-x snap-proximity";

export const HORIZONTAL_RAIL_INSET_CLASS =
  `${HORIZONTAL_RAIL_CLASS} -mx-4 px-4 md:-mx-8 md:px-8`;

/** Full viewport width on large screens — no max-width on the scroll track. */
export const HORIZONTAL_RAIL_BLEED_CLASS =
  `${HORIZONTAL_RAIL_CLASS} px-4 md:px-8`;

export const HORIZONTAL_RAIL_BLEED_PROXIMITY_CLASS =
  `${HORIZONTAL_RAIL_PROXIMITY_CLASS} px-4 md:px-8 pb-6`;

export const HORIZONTAL_RAIL_BLEED_WRAPPER_CLASS = "w-full max-w-none lg:layout-bleed-full";

/** Editorial-scale product tiles on homepage rails (matches promo / New In sizing). */
export const HOMEPAGE_PRODUCT_CARD_WIDTH_CLASS =
  "flex-shrink-0 w-[180px] sm:w-[210px] md:w-[240px] lg:w-[280px] xl:w-[300px] 2xl:w-[320px] snap-start";

export const HORIZONTAL_RAIL_PRODUCT_CARD_CLASS = HOMEPAGE_PRODUCT_CARD_WIDTH_CLASS;

export const HORIZONTAL_RAIL_COLLECTION_TILE_CLASS =
  "flex-shrink-0 w-[280px] sm:w-[320px] snap-start";
