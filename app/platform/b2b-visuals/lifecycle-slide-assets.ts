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

/**
 * Uses the workspace / product graphics already shipped in public/platform
 * (hero silk, ingest/structure/diagnose laptops, issues, passport, experience).
 * Empty slots previously rendered the "Ready for stage artwork" placeholder.
 */
export const LIFECYCLE_SLIDE_ASSETS: Record<
  "create" | "verify" | "comply" | "distribute" | "extend",
  LifecycleSlideAssets
> = {
  create: {
    productImage: "/platform/hero-silk-dress.png",
    softwareImage: "/platform/understand-ingest-laptop.jpg",
    softwareImageSecondary: "/platform/workspace-products.png",
  },
  verify: {
    productImage: "/platform/hero-silk-dress.png",
    softwareImage: "/platform/understand-issues.png",
    softwareImageSecondary: "/platform/workspace-issues.png",
  },
  comply: {
    productImage: "/platform/hero-product-window.png",
    softwareImage: "/platform/hero-workspace-desktop.png",
    softwareImageSecondary: "/platform/understand-structure-laptop.jpg",
  },
  distribute: {
    productImage: "/platform/hero-silk-dress.png",
    softwareImage: "/platform/act-passport.png",
    softwareImageSecondary: "/platform/hero-workspace-desktop.png",
  },
  extend: {
    productImage: "/platform/hero-silk-dress.png",
    softwareImage: "/platform/hero-lifecycle-experience.jpg",
    softwareImageSecondary: "/platform/surface-iphone-scanner.jpg",
  },
};
