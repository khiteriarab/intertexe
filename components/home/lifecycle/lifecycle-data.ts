export type LifecycleAlign = "left" | "right";

export type LifecycleDiagramType = "intelligence" | "traceability" | "connected";

export type LifecycleRow = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  align: LifecycleAlign;
  diagramType: LifecycleDiagramType;
  href: string;
  cta: string;
};

export const LIFECYCLE_ROWS: LifecycleRow[] = [
  {
    id: "product-intelligence",
    title: "Product Intelligence",
    subtitle: "Turn fragmented product data into one trusted product record.",
    description:
      "Bring together materials, suppliers, manufacturing inputs, and source documents into one governed product record that teams can actually use.",
    tags: ["Materials", "Suppliers", "Manufacturing", "Composition", "Evidence"],
    align: "left",
    diagramType: "intelligence",
    href: "/brands/demo",
    cta: "See it live",
  },
  {
    id: "traceability-compliance",
    title: "Traceability + Compliance",
    subtitle: "Prove what your product is, where it came from, and whether it is ready for regulation.",
    description:
      "Link product claims to evidence, close data gaps, support Digital Product Passport readiness, and keep product information audit-ready across teams and supply chains.",
    tags: ["Digital Product Passport", "Traceability", "Evidence", "Chain of Custody", "Compliance"],
    align: "right",
    diagramType: "traceability",
    href: "/brands/solutions",
    cta: "Explore solutions",
  },
  {
    id: "connected-product",
    title: "Connected Product",
    subtitle: "Keep the product record useful after publish.",
    description:
      "Activate the governed record through QR, NFC, or passport delivery so it can support transparency, care, repair, resale, and next-life pathways.",
    tags: ["QR / NFC", "Digital Product Passport", "Care", "Repair", "Resale"],
    align: "left",
    diagramType: "connected",
    href: "/brands/demo",
    cta: "See a live product",
  },
];
