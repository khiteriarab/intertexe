/** INTERTEXE flywheel: consumer brand → governed intelligence → enterprise action */

export const DUAL_MODEL_FLYWHEEL = [
  {
    id: "discover",
    label: "Discover",
    title: "Consumer brand",
    body: "Shop, scan, and save on intertexe.com — every product carries verified composition.",
    href: "https://www.intertexe.com/shop",
    surface: "consumer" as const,
  },
  {
    id: "aggregate",
    label: "Aggregate",
    title: "Textile intelligence",
    body: "Scans and assortment feed governed aggregates — no shopper identity crosses to brands.",
    href: null,
    surface: "intelligence" as const,
  },
  {
    id: "signal",
    label: "Signal",
    title: "Consumer signals",
    body: "Category fiber tilt, natural affinity, and alternative-seeking pressure surface in benchmarking.",
    href: null,
    surface: "intelligence" as const,
  },
  {
    id: "act",
    label: "Act",
    title: "Enterprise workspace",
    body: "Passports, workflows, and supplier evidence — compliance plus material strategy on real SKUs.",
    href: null,
    surface: "enterprise" as const,
  },
] as const;

export const CONSUMER_PROOF_LINKS = [
  { label: "Shop", href: "https://www.intertexe.com/shop", description: "Verified natural fiber catalog" },
  { label: "Scanner", href: "https://www.intertexe.com/scanner", description: "Label intelligence in the wild" },
  { label: "Platform", href: "https://www.intertexe.com/platform", description: "Material intelligence for brands" },
] as const;

export function isCustomerZeroOrg(slug: string): boolean {
  return slug === "intertexe";
}
