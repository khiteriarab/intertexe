export type SolutionCard = {
  key: string;
  label: string;
  title: string;
  description: string;
  tags: string[];
  href: string;
  /** Dashboard sidebar icon key (EnterpriseNavIcons item or group). */
  icon: "core" | "issues" | "intelligence" | "passports" | "workflows" | "suppliers";
};

/** Six commercial applications of the same governed product record. */
export const SOLUTIONS: SolutionCard[] = [
  {
    key: "product-intelligence",
    label: "Product intelligence",
    title: "Build one trusted product record.",
    description:
      "Turn fragmented materials, supplier data, specifications, certifications, and source files into structured product intelligence your teams can actually use.",
    tags: ["Product identity", "Materials + composition", "Supplier data", "Evidence", "Governed record"],
    href: "/brands/product-intelligence",
    icon: "core",
  },
  {
    key: "traceability",
    label: "Traceability + compliance",
    title: "Know where every product came from.",
    description:
      "Trace materials and manufacturing, identify evidence gaps, resolve conflicting data, and prepare product records for Digital Product Passports and evolving regulation.",
    tags: ["Traceability", "Evidence verification", "Compliance readiness", "DPP preparation", "Regulatory intelligence"],
    href: "/brands/traceability",
    icon: "issues",
  },
  {
    key: "environmental",
    label: "Environmental intelligence",
    title: "See where impact actually happens.",
    description:
      "Understand environmental performance across materials, sourcing, manufacturing, and lifecycle stages so teams can compare products, identify hotspots, and act earlier.",
    tags: ["Environmental impact", "Material benchmarking", "PEF-ready insights", "LCA inputs", "Impact hotspots"],
    href: "/brands/environmental-intelligence",
    icon: "intelligence",
  },
  {
    key: "passport",
    label: "Digital Product Passport",
    title: "Turn approved data into a living product identity.",
    description:
      "Publish trusted product information for consumers, regulators, and partners through a persistent digital passport connected to the original governed record.",
    tags: ["Digital Product Passport", "Consumer transparency", "QR-ready", "Care information", "Verified product data"],
    href: "/brands/digital-product-passport",
    icon: "passports",
  },
  {
    key: "lifecycle",
    label: "Connected product lifecycle",
    title: "Keep the product record working after the first sale.",
    description:
      "Extend product intelligence into care, repair, resale value, ownership transfer, circularity, and next-life experiences from the same record.",
    tags: ["Care + repair", "Resale value", "Ownership transfer", "Next life", "Circularity"],
    href: "/brands/solutions",
    icon: "workflows",
  },
  {
    key: "supplier",
    label: "Supplier data + scorecards",
    title: "Turn supplier evidence into decisions.",
    description:
      "Centralize supplier records, certifications, documentation, sourcing evidence, and performance so teams can compare suppliers and see where action is needed.",
    tags: ["Supplier records", "Evidence status", "Scorecards", "Sourcing risk", "Compliance gaps"],
    href: "/brands/supplier-data",
    icon: "suppliers",
  },
];

export const LIFECYCLE_STAGES = [
  { stage: "Create", label: "Product data" },
  { stage: "Prove", label: "Traceability" },
  { stage: "Understand", label: "Impact" },
  { stage: "Publish", label: "Passport" },
  { stage: "Extend", label: "Care + resale" },
] as const;
