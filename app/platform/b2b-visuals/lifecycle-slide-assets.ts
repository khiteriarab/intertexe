/** Drop-in assets for lifecycle slide screens — one set per stage. */
export type LifecycleSlideAssets = {
  /** Physical product / garment hero for this stage */
  productImage?: string;
  /** Primary workspace or passport UI screenshot */
  softwareImage?: string;
  /** Optional second UI panel (offset stack) */
  softwareImageSecondary?: string;
  /** Full-bleed background scene behind copy + product */
  sceneImage?: string;
};

export const LIFECYCLE_SLIDE_ASSETS: Record<
  "create" | "verify" | "comply" | "distribute" | "extend",
  LifecycleSlideAssets
> = {
  create: {},
  verify: {},
  comply: {},
  distribute: {},
  extend: {},
};
