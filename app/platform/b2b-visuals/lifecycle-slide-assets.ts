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
 * Highlighted workspace UI next to Create / Verify / Comply / Distribute / Extend
 * uses live INTERTEXE dashboard screens (overview, issues, operations, product record, suppliers).
 */
export const LIFECYCLE_SLIDE_ASSETS: Record<
  "create" | "verify" | "comply" | "distribute" | "extend",
  LifecycleSlideAssets
> = {
  create: {
    productImage: "/platform/hero-silk-dress.png",
    softwareImage: "/platform/workspace-overview.png",
    softwareImageSecondary: "/platform/workspace-operations.png",
    sceneImage: "/fabrics/fabric-linen.jpg",
  },
  verify: {
    productImage: "/platform/hero-silk-dress.png",
    softwareImage: "/platform/workspace-issues-inbox.png",
    softwareImageSecondary: "/platform/workspace-issues.png",
    sceneImage: "/fabrics/fabric-cotton.jpg",
  },
  comply: {
    productImage: "/platform/hero-product-window.png",
    softwareImage: "/platform/workspace-operations.png",
    softwareImageSecondary: "/platform/workspace-overview.png",
    sceneImage: "/fabrics/fabric-wool.jpg",
  },
  distribute: {
    productImage: "/platform/hero-silk-dress.png",
    softwareImage: "/platform/workspace-product-record.png",
    softwareImageSecondary: "/platform/workspace-overview.png",
    sceneImage: "/fabrics/fabric-silk.jpg",
  },
  extend: {
    productImage: "/platform/hero-silk-dress.png",
    softwareImage: "/platform/workspace-suppliers.png",
    softwareImageSecondary: "/platform/workspace-product-record.png",
    sceneImage: "/fabrics/fabric-cashmere.jpg",
  },
};
