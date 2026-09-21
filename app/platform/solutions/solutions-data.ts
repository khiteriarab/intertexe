export type SolutionCard = {
  key: string;
  label: string;
  title: string;
  description: string;
  tags: string[];
  href: string;
  /** Dashboard sidebar icon key (EnterpriseNavIcons item or group). */
  icon: "core" | "issues" | "intelligence" | "passports" | "workflows" | "suppliers";
  proposition: string;
  detail: string[];
  get: string[];
  why: string;
  visual: string;
  visualAlt: string;
  cta: { label: string; href: string };
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
    proposition: "One governed record instead of scattered product files.",
    detail: [
      "INTERTEXE brings product information from PLM, ERP, supplier files, spreadsheets, certification records, and other existing systems into one governed product record.",
      "Rather than replacing the original source data, INTERTEXE preserves provenance while normalizing product identity, material composition, supplier evidence, and supporting documentation into a consistent structure.",
      "Teams can then use that record across compliance, passports, analytics, resale, and downstream product experiences without rebuilding the same product data for every use case.",
    ],
    get: [
      "Unified product identity",
      "Materials and composition normalization",
      "Supplier and source records",
      "Evidence and certification linking",
      "Governed product history",
      "Reusable structured product data",
    ],
    why: "One product record becomes the foundation for every downstream workflow, reducing duplicate work and making product data more trustworthy across teams.",
    visual: "/platform/workspace-product-record.png",
    visualAlt: "INTERTEXE product record workspace with structured product identity and materials.",
    cta: { label: "See it live", href: "/brands/demo" },
  },
  {
    key: "traceability",
    label: "Traceability + compliance",
    title: "Know where every product claim came from.",
    description:
      "Connect product and material claims to supplier evidence, traceability records, certifications, and compliance requirements.",
    tags: ["Traceability", "Evidence verification", "Compliance readiness", "DPP preparation", "Regulatory intelligence"],
    href: "/brands/traceability",
    icon: "issues",
    proposition: "Claims linked to evidence — not buried in inboxes.",
    detail: [
      "INTERTEXE gives teams a structured way to connect product claims to the evidence behind them.",
      "Supplier records, certifications, sourcing documentation, manufacturing data, and product-level claims can be linked to the same governed record, making it easier to see what is verified, what is missing, and what requires review.",
      "Teams can use the same evidence layer to support Digital Product Passports, internal compliance workflows, regulatory readiness, and customer transparency.",
    ],
    get: [
      "Supplier traceability",
      "Evidence verification",
      "Certification records",
      "Compliance readiness",
      "DPP preparation",
      "Issue and gap detection",
    ],
    why: "Instead of hunting through emails, files, and supplier documents, teams can see the evidence behind a product claim in one place.",
    visual: "/platform/workspace-issues.png",
    visualAlt: "INTERTEXE issues workspace showing evidence gaps and claim verification.",
    cta: { label: "See it live", href: "/brands/demo" },
  },
  {
    key: "environmental",
    label: "Environmental intelligence",
    title: "See where impact actually happens.",
    description:
      "Compare environmental performance across materials, sourcing, manufacturing, and lifecycle stages to identify hotspots and improvement opportunities.",
    tags: ["Environmental impact", "Material benchmarking", "PEF-ready insights", "LCA inputs", "Impact hotspots"],
    href: "/brands/environmental-intelligence",
    icon: "intelligence",
    proposition: "Impact intelligence connected to the product record — not a disconnected report.",
    detail: [
      "INTERTEXE turns product and material data into environmental intelligence that teams can use at the product and portfolio level.",
      "Environmental impact metrics can be connected back to the underlying product record, allowing teams to compare fiber choices, suppliers, product categories, and lifecycle stages rather than viewing impact as a disconnected sustainability report.",
      "Over time, brands can benchmark product performance against their own catalog and governed peer datasets.",
    ],
    get: [
      "Environmental impact metrics",
      "Material benchmarking",
      "Lifecycle impact analysis",
      "PEF / LCA-ready inputs",
      "Product comparisons",
      "Impact hotspots",
    ],
    why: "Teams can see which materials, sourcing decisions, and product stages are actually driving impact and use that intelligence to improve future products.",
    visual: "/platform/workspace-analytics.png",
    visualAlt: "INTERTEXE environmental intelligence with impact metrics and material benchmarks.",
    cta: { label: "See it live", href: "/brands/demo" },
  },
  {
    key: "passport",
    label: "Digital Product Passport",
    title: "Publish one governed record everywhere.",
    description:
      "Turn approved product data into a living digital passport for your website, app, QR code, white-label experience, or connected partner channels.",
    tags: ["Digital Product Passport", "Hosted · white label · API", "QR · NFC · RFID", "Consumer transparency", "Verified product data"],
    href: "/brands/digital-product-passport",
    icon: "passports",
    proposition: "Publish once from the governed record — hosted, white-labeled, or via API.",
    detail: [
      "Once product information is approved, INTERTEXE can publish it as a persistent Digital Product Passport connected to the original governed product record.",
      "Brands can use the INTERTEXE-hosted passport, embed the data into their own website or app, connect it to physical QR, NFC, or RFID carriers, or access the same record through the API.",
      "The passport can evolve with the product over time, supporting care, repair, ownership transfer, resale, and next-life services.",
    ],
    get: [
      "Hosted Digital Product Passport",
      "White-label capability",
      "QR / NFC / RFID support",
      "API access",
      "Consumer transparency",
      "Verified product data",
    ],
    why: "The same trusted product record can power both regulatory disclosure and a richer post-purchase customer experience.",
    visual: "/platform/act-passport.png",
    visualAlt: "Digital Product Passport experience connected to a governed INTERTEXE record.",
    cta: { label: "See it live", href: "/brands/demo" },
  },
  {
    key: "lifecycle",
    label: "Connected product lifecycle",
    title: "Keep the product record useful after the first sale.",
    description:
      "Extend product intelligence into care, repair, resale, ownership transfer, circularity, and next-life experiences.",
    tags: ["Care + repair", "Resale value", "Ownership transfer", "Next life", "Circularity"],
    href: "/brands/connected-product-lifecycle",
    icon: "workflows",
    proposition: "A living product identity that keeps working after checkout.",
    detail: [
      "INTERTEXE treats the product passport as a living record rather than a static compliance page.",
      "After purchase, the same identity can support care instructions, repairs, resale listings, ownership transfer, donation guidance, recycling information, and future circular services.",
      "This gives brands a persistent connection to the product throughout its useful life without creating a new record for every downstream service.",
    ],
    get: [
      "Care and repair",
      "Resale value",
      "Ownership transfer",
      "Circularity guidance",
      "Next-life services",
      "Persistent product identity",
    ],
    why: "Product data continues creating value after checkout instead of disappearing once the transaction is complete.",
    visual: "/platform/solutions-governed-record.png",
    visualAlt: "Governed product record supporting care, resale, and next-life pathways.",
    cta: { label: "Request a demo", href: "/brands/request?intent=demo&cta=solutions_lifecycle" },
  },
  {
    key: "supplier",
    label: "Supplier data + scorecards",
    title: "Turn supplier evidence into decisions.",
    description:
      "Centralize supplier records, certifications, sourcing evidence, and performance data so teams can compare suppliers and identify gaps.",
    tags: ["Supplier records", "Evidence status", "Scorecards", "Sourcing risk", "Compliance gaps"],
    href: "/brands/supplier-data",
    icon: "suppliers",
    proposition: "Supplier evidence connected to the products those suppliers support.",
    detail: [
      "INTERTEXE connects supplier-level information directly to the products and materials those suppliers support.",
      "Teams can track documentation, sourcing evidence, certifications, traceability coverage, compliance gaps, and eventually performance indicators in one system.",
      "This makes supplier information usable for procurement, compliance, sustainability, and product development rather than leaving it buried across separate tools and files.",
    ],
    get: [
      "Supplier records",
      "Evidence tracking",
      "Certification status",
      "Scorecards",
      "Sourcing risk",
      "Compliance gaps",
    ],
    why: "Teams can understand which suppliers support trusted product data, where evidence is weak, and where action is needed.",
    visual: "/platform/workspace-suppliers.png",
    visualAlt: "INTERTEXE supplier scorecards with evidence status and compliance gaps.",
    cta: { label: "Request a demo", href: "/brands/request?intent=demo&cta=solutions_supplier" },
  },
];

export const LIFECYCLE_STAGES = [
  { stage: "Create", label: "Product data" },
  { stage: "Prove", label: "Traceability" },
  { stage: "Understand", label: "Impact" },
  { stage: "Publish", label: "Passport" },
  { stage: "Extend", label: "Care + resale" },
] as const;
