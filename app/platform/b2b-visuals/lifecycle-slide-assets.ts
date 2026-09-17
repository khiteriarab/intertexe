/** Drop-in assets for lifecycle slide screens — one workspace screenshot per stage. */
export type LifecycleSlideAssets = {
  /** Live INTERTEXE workspace screenshot for this stage */
  softwareImage?: string;
};

/**
 * One original workspace screenshot per stage, shown next to Create / Verify /
 * Comply / Distribute / Extend. Screenshots only — no person behind the UI and
 * no product photo in the corner.
 */
export const LIFECYCLE_SLIDE_ASSETS: Record<
  "create" | "verify" | "comply" | "distribute" | "extend",
  LifecycleSlideAssets
> = {
  create: {
    softwareImage: "/platform/workspace-overview.png",
  },
  verify: {
    softwareImage: "/platform/workspace-issues-inbox.png",
  },
  comply: {
    softwareImage: "/platform/workspace-operations.png",
  },
  distribute: {
    softwareImage: "/platform/workspace-product-record.png",
  },
  extend: {
    softwareImage: "/platform/workspace-suppliers.png",
  },
};
