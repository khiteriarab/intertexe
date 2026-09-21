/**
 * Public SaaS pricing presentation config — single source for /brands/pricing.
 *
 * Customer-facing names: Foundation · Intelligence · Enterprise
 * Legacy entitlement keys (unchanged): professional · platform · enterprise
 *
 * Commercial limits and implementation fees are aligned with lib/enterprise/pricing.ts
 * and Paddle mapping in lib/enterprise/paddle.ts.
 *
 * Presentation nuance (feature depth labels, not allowance deltas):
 * - Foundation marketing shows Material Benchmark as Basic; entitlement still uses advanced_benchmarking flag for access.
 * - Foundation excludes general API (imports/exports only) — matches planDefinition features.
 */

import { marketingPath } from "./paths";

export type PublicPlanId = "foundation" | "intelligence" | "enterprise";

/** Legacy entitlement / checkout plan keys — keep for request forms & backend compatibility. */
export type LegacySaasPlanKey = "professional" | "platform" | "enterprise";

export type FeatureCellValue =
  | "included"
  | "basic"
  | "advanced"
  | "custom"
  | "addon"
  | "unavailable"
  | string;

export type PricingFeatureRow = {
  id: string;
  label: string;
  tooltip?: string;
  values: Record<PublicPlanId, FeatureCellValue>;
};

export type PricingFeatureGroup = {
  id: string;
  label: string;
  rows: PricingFeatureRow[];
};

export type PublicPricingPlan = {
  id: PublicPlanId;
  /** Entitlement key used by request CTAs / backend — do not change enforcement here. */
  legacyPlanKey: LegacySaasPlanKey;
  name: string;
  monthlyUSD: number | null;
  commitmentMonths: number;
  implementationFeeUSD: number | null;
  /** When implementation is custom, marketing floor. */
  implementationFromUSD?: number;
  productLimit: number | null;
  passportLimit: number | null;
  seatLimit: number | null;
  description: string;
  idealCustomer: string;
  highlights: string[];
  cta: { label: string; href: string };
  featured: boolean;
};

/** Isolated FX estimate — replace with live source later without touching UI. */
export function approximateEurFromUsd(usd: number): number {
  const rate = Number(process.env.NEXT_PUBLIC_USD_EUR_ESTIMATE_RATE || "0.92");
  const safe = Number.isFinite(rate) && rate > 0 ? rate : 0.92;
  return Math.round(usd * safe);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatEurEstimate(amountUsd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(approximateEurFromUsd(amountUsd));
}

export function formatMonthlyPrice(plan: PublicPricingPlan, currency: "USD" | "EUR"): string {
  if (plan.monthlyUSD == null) return "Custom";
  if (currency === "EUR") return `${formatEurEstimate(plan.monthlyUSD)}/mo`;
  return `${formatUsd(plan.monthlyUSD)}/mo`;
}

export function formatImplementation(plan: PublicPricingPlan, currency: "USD" | "EUR"): string {
  if (plan.implementationFeeUSD == null) {
    const from = plan.implementationFromUSD ?? 5_000;
    const label = currency === "EUR" ? formatEurEstimate(from) : formatUsd(from);
    return `Custom, typically from ${label}`;
  }
  const amount =
    currency === "EUR" ? formatEurEstimate(plan.implementationFeeUSD) : formatUsd(plan.implementationFeeUSD);
  return `${amount} one-time`;
}

export function formatLimit(n: number | null, unit: string): string {
  if (n == null) return "Custom";
  return `${n.toLocaleString("en-US")} ${unit}`;
}

export function cellDisplay(value: FeatureCellValue): string {
  switch (value) {
    case "included":
      return "Included";
    case "basic":
      return "Basic";
    case "advanced":
      return "Advanced";
    case "custom":
      return "Custom";
    case "addon":
      return "Add-on";
    case "unavailable":
      return "—";
    default:
      return value;
  }
}

export function rowDiffers(row: PricingFeatureRow): boolean {
  const vals = Object.values(row.values);
  return new Set(vals).size > 1;
}

export const PUBLIC_PRICING_PLANS: PublicPricingPlan[] = [
  {
    id: "foundation",
    legacyPlanKey: "professional",
    name: "Foundation",
    monthlyUSD: 499,
    commitmentMonths: 6,
    implementationFeeUSD: 1_500,
    productLimit: 2_500,
    passportLimit: 2_500,
    seatLimit: 5,
    description: "Build the product data foundation.",
    idealCustomer:
      "Brands that need governed product data, structured material information, product passports, and core transparency tools across a focused catalog.",
    highlights: [
      "Governed product records & Digital Product Passports",
      "Basic traceability, compliance readiness & supplier evidence",
      "Material Benchmark (Basic) & standard analytics",
      "2,500 products · 2,500 passports · 5 seats",
    ],
    cta: {
      label: "Start with Foundation",
      href: marketingPath("request?intent=saas&tier=professional&cta=pricing_foundation"),
    },
    featured: false,
  },
  {
    id: "intelligence",
    legacyPlanKey: "platform",
    name: "Intelligence",
    monthlyUSD: 1_250,
    commitmentMonths: 6,
    implementationFeeUSD: 3_500,
    productLimit: 10_000,
    passportLimit: 10_000,
    seatLimit: 15,
    description: "Turn product data into actionable intelligence.",
    idealCustomer:
      "Brands managing larger catalogs with deeper traceability, compliance, supplier intelligence, analytics, publishing, and connected lifecycle workflows.",
    highlights: [
      "Everything in Foundation, plus advanced intelligence",
      "White-label passports · standard API & webhooks",
      "Circularity / resale · advanced analytics & scorecards",
      "10,000 products · 10,000 passports · 15 seats",
    ],
    cta: {
      label: "Explore Intelligence",
      href: marketingPath("request?intent=saas&tier=platform&cta=pricing_intelligence"),
    },
    featured: true,
  },
  {
    id: "enterprise",
    legacyPlanKey: "enterprise",
    name: "Enterprise",
    monthlyUSD: null,
    commitmentMonths: 11,
    implementationFeeUSD: null,
    implementationFromUSD: 5_000,
    productLimit: null,
    passportLimit: null,
    seatLimit: null,
    description: "Infrastructure for complex product ecosystems.",
    idealCustomer:
      "Large brands, retailers, groups, and multi-brand organizations that need custom governance, integrations, security, and scale.",
    highlights: [
      "Custom volume, seats, and multi-brand deployments",
      "SSO · custom domains · headless passport API",
      "PLM / PIM / ERP & custom compliance programs",
      "Dedicated implementation · custom SLA",
    ],
    cta: {
      label: "Talk to INTERTEXE",
      href: marketingPath("request?intent=enterprise&cta=pricing_enterprise"),
    },
    featured: false,
  },
];

export function publicPlanById(id: PublicPlanId): PublicPricingPlan {
  const plan = PUBLIC_PRICING_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown public plan: ${id}`);
  return plan;
}

/** Map legacy entitlement keys → public marketing plan ids. */
export const LEGACY_TO_PUBLIC_PLAN: Record<LegacySaasPlanKey, PublicPlanId> = {
  professional: "foundation",
  platform: "intelligence",
  enterprise: "enterprise",
};

export const PUBLIC_TO_LEGACY_PLAN: Record<PublicPlanId, LegacySaasPlanKey> = {
  foundation: "professional",
  intelligence: "platform",
  enterprise: "enterprise",
};

export const PRICING_FEATURE_GROUPS: PricingFeatureGroup[] = [
  {
    id: "product-intelligence",
    label: "Product Intelligence",
    rows: [
      {
        id: "governed-records",
        label: "Governed product records",
        tooltip: "One structured product record spanning identity, materials, and provenance.",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "product-identity",
        label: "Product identity",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "materials-composition",
        label: "Materials and composition",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "advanced-product-intelligence",
        label: "Advanced product intelligence",
        values: { foundation: "unavailable", intelligence: "included", enterprise: "included" },
      },
      {
        id: "ai-intelligence",
        label: "AI intelligence insights",
        tooltip: "Workspace intelligence layer — depth scales by plan.",
        values: { foundation: "basic", intelligence: "advanced", enterprise: "Advanced / Custom" },
      },
    ],
  },
  {
    id: "data-governance",
    label: "Product Data & Governance",
    rows: [
      {
        id: "import-normalize",
        label: "Import and normalization",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "validation",
        label: "Product data validation",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "issues",
        label: "Issues / missing-data visibility",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "approvals",
        label: "Approval workflows",
        values: { foundation: "basic", intelligence: "advanced", enterprise: "advanced" },
      },
      {
        id: "audit-history",
        label: "Audit / activity history",
        values: { foundation: "basic", intelligence: "advanced", enterprise: "advanced" },
      },
      {
        id: "unlimited-exports",
        label: "Unlimited exports",
        values: { foundation: "unavailable", intelligence: "included", enterprise: "included" },
      },
    ],
  },
  {
    id: "passports",
    label: "Digital Product Passports",
    rows: [
      {
        id: "dpp-create",
        label: "Digital Product Passport creation",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "passport-publish",
        label: "Passport publishing",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "qr-publishing",
        label: "QR publishing",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "hosted-passports",
        label: "Hosted passport experiences",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "white-label",
        label: "White-label passport delivery",
        values: { foundation: "unavailable", intelligence: "included", enterprise: "included" },
      },
      {
        id: "custom-domains",
        label: "Custom domains",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "included" },
      },
      {
        id: "multi-market-passport",
        label: "Multi-market passport configuration",
        tooltip: "Where supported in the product.",
        values: { foundation: "unavailable", intelligence: "included", enterprise: "Custom" },
      },
      {
        id: "passport-analytics",
        label: "Passport analytics",
        values: { foundation: "basic", intelligence: "advanced", enterprise: "advanced" },
      },
    ],
  },
  {
    id: "traceability",
    label: "Traceability",
    rows: [
      {
        id: "basic-traceability",
        label: "Traceability workspace",
        values: { foundation: "basic", intelligence: "advanced", enterprise: "advanced" },
      },
      {
        id: "provenance-evidence",
        label: "Provenance and evidence management",
        values: { foundation: "basic", intelligence: "advanced", enterprise: "Advanced / Custom" },
      },
      {
        id: "multi-tier-supply",
        label: "Multi-tier supply chain",
        values: { foundation: "basic", intelligence: "advanced", enterprise: "custom" },
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance & Evidence",
    rows: [
      {
        id: "compliance-readiness",
        label: "Compliance readiness",
        values: { foundation: "basic", intelligence: "advanced", enterprise: "advanced" },
      },
      {
        id: "compliance-workflows",
        label: "Compliance workflows",
        values: { foundation: "unavailable", intelligence: "advanced", enterprise: "Custom" },
      },
      {
        id: "custom-compliance",
        label: "Custom compliance programs",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "custom" },
      },
    ],
  },
  {
    id: "environmental",
    label: "Environmental Intelligence",
    rows: [
      {
        id: "sustainability-fields",
        label: "Sustainability / environmental fields",
        values: { foundation: "basic", intelligence: "included", enterprise: "included" },
      },
      {
        id: "env-intelligence",
        label: "Environmental intelligence",
        values: { foundation: "unavailable", intelligence: "included", enterprise: "included" },
      },
      {
        id: "sust-analytics",
        label: "Sustainability / traceability analytics",
        values: { foundation: "unavailable", intelligence: "advanced", enterprise: "advanced" },
      },
      {
        id: "material-benchmark",
        label: "Material Benchmark",
        values: { foundation: "basic", intelligence: "advanced", enterprise: "Advanced / Custom" },
      },
      {
        id: "pef-lca",
        label: "PEF / full LCA",
        tooltip: "Not a core entitlement today — offered as add-on or custom scope.",
        values: { foundation: "unavailable", intelligence: "addon", enterprise: "custom" },
      },
    ],
  },
  {
    id: "suppliers",
    label: "Suppliers & Scorecards",
    rows: [
      {
        id: "supplier-records",
        label: "Supplier records",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "evidence-requests",
        label: "Supplier evidence requests",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "scorecards",
        label: "Supplier scorecards",
        values: { foundation: "unavailable", intelligence: "included", enterprise: "included" },
      },
      {
        id: "supplier-performance",
        label: "Supplier performance views",
        values: { foundation: "unavailable", intelligence: "advanced", enterprise: "Advanced / Custom" },
      },
      {
        id: "custom-supplier-programs",
        label: "Custom supplier programs",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "custom" },
      },
    ],
  },
  {
    id: "publishing",
    label: "Publishing & Distribution",
    rows: [
      {
        id: "hosted-delivery",
        label: "Hosted passport delivery",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "wl-delivery",
        label: "White-label delivery",
        values: { foundation: "unavailable", intelligence: "included", enterprise: "included" },
      },
      {
        id: "domain-delivery",
        label: "Custom domain delivery",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "included" },
      },
      {
        id: "headless-delivery",
        label: "Headless distribution",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "included" },
      },
    ],
  },
  {
    id: "lifecycle",
    label: "Connected Product Lifecycle",
    rows: [
      {
        id: "care-repair",
        label: "Care / repair / next-life",
        values: { foundation: "basic", intelligence: "included", enterprise: "Included / Custom" },
      },
      {
        id: "circularity",
        label: "Resale / circularity workflows",
        values: { foundation: "unavailable", intelligence: "included", enterprise: "Included / Custom" },
      },
      {
        id: "ownership-transfer",
        label: "Ownership transfer",
        tooltip: "Not fully productized as a core entitlement — add-on or custom.",
        values: { foundation: "unavailable", intelligence: "addon", enterprise: "custom" },
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics & Benchmarking",
    rows: [
      {
        id: "standard-analytics",
        label: "Standard analytics",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "catalog-health",
        label: "Catalog readiness / health",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "consumer-signals",
        label: "Consumer signals",
        values: { foundation: "basic", intelligence: "advanced", enterprise: "Advanced / Custom" },
      },
      {
        id: "custom-reporting",
        label: "Custom reporting",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "custom" },
      },
      {
        id: "custom-benchmarking",
        label: "Custom benchmarking",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "custom" },
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations & API",
    rows: [
      {
        id: "file-imports-exports",
        label: "Standard file / data imports and exports",
        values: { foundation: "included", intelligence: "included", enterprise: "included" },
      },
      {
        id: "api-access",
        label: "API access",
        tooltip: "Foundation marketing excludes general API; entitlement flag may still exist on legacy professional — presentation follows commercial matrix.",
        values: {
          foundation: "unavailable",
          intelligence: "Standard API + webhooks",
          enterprise: "Headless + custom",
        },
      },
      {
        id: "webhooks",
        label: "Webhooks / developer credentials",
        values: { foundation: "unavailable", intelligence: "included", enterprise: "included" },
      },
      {
        id: "advanced-integrations",
        label: "Advanced integrations",
        values: { foundation: "unavailable", intelligence: "included", enterprise: "included" },
      },
      {
        id: "plm-pim-erp",
        label: "PLM / PIM / ERP integrations",
        values: {
          foundation: "File imports only",
          intelligence: "Advanced integrations available",
          enterprise: "Custom integrations",
        },
      },
      {
        id: "custom-migration",
        label: "Custom migration",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "custom" },
      },
    ],
  },
  {
    id: "org-security",
    label: "Organization & Security",
    rows: [
      {
        id: "team-seats",
        label: "Team seats",
        values: { foundation: "5 seats", intelligence: "15 seats", enterprise: "Custom" },
      },
      {
        id: "product-allowance",
        label: "Managed products",
        values: { foundation: "2,500", intelligence: "10,000", enterprise: "Custom" },
      },
      {
        id: "passport-allowance",
        label: "Hosted Digital Product Passports",
        values: { foundation: "2,500", intelligence: "10,000", enterprise: "Custom" },
      },
      {
        id: "sso",
        label: "SSO",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "included" },
      },
      {
        id: "multi-brand",
        label: "Multi-brand / multi-org deployments",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "custom" },
      },
      {
        id: "priority-support",
        label: "Priority support",
        values: { foundation: "unavailable", intelligence: "included", enterprise: "included" },
      },
      {
        id: "custom-sla",
        label: "Custom SLA",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "custom" },
      },
    ],
  },
  {
    id: "implementation",
    label: "Implementation & Support",
    rows: [
      {
        id: "impl-fee",
        label: "One-time implementation",
        values: {
          foundation: "$1,500",
          intelligence: "$3,500",
          enterprise: "Typically from $5,000",
        },
      },
      {
        id: "commitment",
        label: "Commitment term",
        values: { foundation: "6 months", intelligence: "6 months", enterprise: "11 months" },
      },
      {
        id: "billing",
        label: "Billing cadence",
        values: { foundation: "Monthly", intelligence: "Monthly", enterprise: "Monthly" },
      },
      {
        id: "support-level",
        label: "Support",
        values: { foundation: "Standard", intelligence: "Priority", enterprise: "Enterprise / custom" },
      },
      {
        id: "dedicated-impl",
        label: "Dedicated implementation",
        values: { foundation: "unavailable", intelligence: "unavailable", enterprise: "included" },
      },
      {
        id: "additional-volume",
        label: "Additional catalog volume",
        values: {
          foundation: "Additional volume available",
          intelligence: "Additional volume available",
          enterprise: "Custom",
        },
      },
    ],
  },
];

export const PRICING_IMPLEMENTATION_STAGES: Array<{
  step: string;
  title: string;
  copy: string;
}> = [
  {
    step: "01",
    title: "Connect",
    copy: "Bring in product, material, supplier and existing system data.",
  },
  {
    step: "02",
    title: "Configure",
    copy: "INTERTEXE structures your environment, data rules, workflows and publishing settings.",
  },
  {
    step: "03",
    title: "Launch",
    copy: "Validate the setup, train your team and begin publishing governed product intelligence.",
  },
];

export const PRICING_BILLING_POINTS: Array<{ title: string; copy: string }> = [
  {
    title: "Monthly invoices",
    copy: "Your subscription is invoiced every month.",
  },
  {
    title: "Fixed commitment",
    copy: "Foundation and Intelligence require a six-month commitment. Enterprise agreements use an eleven-month initial commitment.",
  },
  {
    title: "One-time implementation",
    copy: "Implementation is charged separately at the beginning of the engagement.",
  },
  {
    title: "USD pricing",
    copy: "Contracts are priced in U.S. dollars. Euro amounts shown on the site are approximate references.",
  },
  {
    title: "Scale with your catalog",
    copy: "Plans include product-volume allowances. Larger catalogs can move into additional capacity bands without changing platforms.",
  },
];

export const PRICING_FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Why is there an implementation fee?",
    a: "It covers migration, configuration, and training: connecting product, material, and supplier data; structuring rules, workflows, and publishing; validating the workspace; and preparing your team so INTERTEXE is ready to operate — not provisioned empty.",
  },
  {
    q: "Can I cancel before my commitment ends?",
    a: "Commitments are contractual. Talk with INTERTEXE about timing, upgrades, or exceptional circumstances — these tiers are not month-to-month cancel-anytime plans.",
  },
  {
    q: "Are invoices monthly?",
    a: "Yes. Subscription charges are invoiced every month. Foundation and Intelligence use a fixed six-month commitment; Enterprise uses an eleven-month initial commitment.",
  },
  {
    q: "Are prices shown in euros fixed?",
    a: "No. Euro amounts on this page are approximate references only. Contracts are priced in U.S. dollars.",
  },
  {
    q: "What counts as an active product record?",
    a: "An active product record is a product identity your team governs in INTERTEXE — typically one style/SKU you maintain for data, evidence, and publishing against your plan allowance.",
  },
  {
    q: "What happens if we exceed our product allowance?",
    a: "Additional capacity bands are available. We do not publish overage rates on this page — contact INTERTEXE to extend volume without changing platforms.",
  },
  {
    q: "Can we upgrade during our commitment?",
    a: "Yes. Upgrades from Foundation to Intelligence during your term are coordinated with the INTERTEXE team.",
  },
  {
    q: "Can INTERTEXE integrate with our PLM or ERP?",
    a: "Foundation supports standard file and data imports. Intelligence adds advanced integrations, API access, and webhooks. Enterprise supports custom PLM / PIM / ERP integrations.",
  },
  {
    q: "Do we need every product to have a Digital Product Passport?",
    a: "Not necessarily. Many brands start with priority collections. Passport volume follows your plan allowance; Enterprise scopes volume in the agreement.",
  },
  {
    q: "Can we start with Foundation and move to Intelligence?",
    a: "Yes — that is the intended path as catalog depth, compliance, and publishing needs grow.",
  },
  {
    q: "Does Enterprise support multiple brands or business units?",
    a: "Yes. Enterprise is designed for multi-brand and multi-org deployments with custom governance and security.",
  },
];
