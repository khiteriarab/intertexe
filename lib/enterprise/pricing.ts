/**
 * INTERTEXE commercial model — 10-product pilot + Foundation / Intelligence / Enterprise.
 *
 * Entitlement keys stay professional · platform · enterprise for DB / Paddle compatibility.
 * Public names: Foundation · Intelligence · Enterprise.
 */

/** Free sales pilot — exactly 10 products, not a subscription tier. */
export const PILOT_PRODUCT_LIMIT = 10;

/** Managed product / passport limits — single source of truth for entitlements, Paddle sync, UI. */
export const FOUNDATION_PRODUCT_LIMIT = 2_500;
export const INTELLIGENCE_PRODUCT_LIMIT = 10_000;

/** @deprecated Prefer FOUNDATION_PRODUCT_LIMIT */
export const PROFESSIONAL_PRODUCT_LIMIT = FOUNDATION_PRODUCT_LIMIT;
/** @deprecated Prefer INTELLIGENCE_PRODUCT_LIMIT */
export const PLATFORM_PRODUCT_LIMIT = INTELLIGENCE_PRODUCT_LIMIT;

export const FOUNDATION_SEAT_LIMIT = 5;
export const INTELLIGENCE_SEAT_LIMIT = 15;

/** Monthly USD — contracts priced in USD. */
export const FOUNDATION_MONTHLY_USD = 499;
export const INTELLIGENCE_MONTHLY_USD = 1_250;

/** @deprecated Prefer FOUNDATION_MONTHLY_USD */
export const PROFESSIONAL_MONTHLY_USD = FOUNDATION_MONTHLY_USD;
/** @deprecated Prefer INTELLIGENCE_MONTHLY_USD */
export const PLATFORM_MONTHLY_USD = INTELLIGENCE_MONTHLY_USD;

/** One-time implementation fees by public tier. */
export const FOUNDATION_IMPLEMENTATION_USD = 1_500;
export const INTELLIGENCE_IMPLEMENTATION_USD = 3_500;
/** Enterprise implementation is custom; marketing floor only. */
export const ENTERPRISE_IMPLEMENTATION_FROM_USD = 5_000;

/** Legacy default when plan-specific fee is unavailable. */
export const ONBOARDING_FEE_USD_DEFAULT = ENTERPRISE_IMPLEMENTATION_FROM_USD;

/** Resolved legacy/global implementation fee (env-configurable). Prefer resolveImplementationFeeUsd(plan). */
export function resolveOnboardingFeeUsd(): number {
  const raw = process.env.INTERTEXE_IMPLEMENTATION_FEE_USD || process.env.ONBOARDING_FEE_USD;
  const parsed = raw ? Number.parseInt(String(raw), 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : ONBOARDING_FEE_USD_DEFAULT;
}

/** Plan-specific implementation fee; null means custom / sales-scoped. */
export function resolveImplementationFeeUsd(plan: string): number | null {
  const p = plan === "saas" ? "professional" : plan;
  if (p === "professional") return FOUNDATION_IMPLEMENTATION_USD;
  if (p === "platform") return INTELLIGENCE_IMPLEMENTATION_USD;
  if (p === "enterprise") return null;
  if (p === "founding_pilot") return resolveOnboardingFeeUsd();
  return resolveOnboardingFeeUsd();
}

/** @deprecated Prefer resolveOnboardingFeeUsd() */
export const ONBOARDING_FEE_USD = ONBOARDING_FEE_USD_DEFAULT;
/** @deprecated Prefer resolveOnboardingFeeUsd() */
export const FOUNDING_PILOT_PRICE_USD = ONBOARDING_FEE_USD_DEFAULT;

export const ONBOARDING_FEE_LABEL = "Implementation fee";

export function onboardingFeePriceLabel(): string {
  return `$${resolveOnboardingFeeUsd().toLocaleString("en-US")}`;
}

/** Plans that operate as the 10-product pilot workspace (no public pricing). */
export function isPilotPlan(plan: string): boolean {
  return plan === "demo" || plan === "free_snapshot";
}

export function isPaidSubscriptionPlan(plan: string): boolean {
  const p = plan === "saas" ? "professional" : plan;
  return p === "professional" || p === "platform";
}

export type SaasTierKey = "professional" | "platform" | "enterprise";

export type PublicPlanName = "Foundation" | "Intelligence" | "Enterprise";

export function publicPlanNameForKey(plan: string): PublicPlanName | string {
  const p = plan === "saas" ? "professional" : plan;
  if (p === "professional") return "Foundation";
  if (p === "platform") return "Intelligence";
  if (p === "enterprise") return "Enterprise";
  return planDisplayName(plan);
}

export type IntertexePlanConfig = {
  name: string;
  publicLabel: string;
  internalMonthlyPrice: number | null;
  currency: "USD";
  productLimit: number | null;
  pricingPublic: boolean;
  contactSales: boolean;
  includesPilot: true;
  implementationFeeType: "fixed_one_time" | "custom";
  implementationUsd: number | null;
};

/** Centralized commercial plan config — use everywhere (public UI, checkout, entitlements). */
export const INTERTEXE_PLANS: Record<SaasTierKey, IntertexePlanConfig> = {
  professional: {
    name: "Foundation",
    publicLabel: `$${FOUNDATION_MONTHLY_USD}/mo`,
    internalMonthlyPrice: FOUNDATION_MONTHLY_USD,
    currency: "USD",
    productLimit: FOUNDATION_PRODUCT_LIMIT,
    pricingPublic: true,
    contactSales: true,
    includesPilot: true,
    implementationFeeType: "fixed_one_time",
    implementationUsd: FOUNDATION_IMPLEMENTATION_USD,
  },
  platform: {
    name: "Intelligence",
    publicLabel: `$${INTELLIGENCE_MONTHLY_USD.toLocaleString("en-US")}/mo`,
    internalMonthlyPrice: INTELLIGENCE_MONTHLY_USD,
    currency: "USD",
    productLimit: INTELLIGENCE_PRODUCT_LIMIT,
    pricingPublic: true,
    contactSales: true,
    includesPilot: true,
    implementationFeeType: "fixed_one_time",
    implementationUsd: INTELLIGENCE_IMPLEMENTATION_USD,
  },
  enterprise: {
    name: "Enterprise",
    publicLabel: "Custom",
    internalMonthlyPrice: null,
    currency: "USD",
    productLimit: null,
    pricingPublic: true,
    contactSales: true,
    includesPilot: true,
    implementationFeeType: "custom",
    implementationUsd: null,
  },
};

export type SaasTierDefinition = {
  key: SaasTierKey;
  name: string;
  /** Public marketing label. */
  publicPriceLabel: string;
  /** Internal checkout / sales label — includes USD when set. */
  priceLabel: string;
  monthlyUsd: number | null;
  implementationUsd: number | null;
  productAllowance: number | null;
  passportAllowance: number | null;
  userSeats: number | null;
  commitmentMonths: number;
  headline: string;
  features: string[];
  notIncluded: string[];
};

export const SAAS_TIERS: SaasTierDefinition[] = [
  {
    key: "professional",
    name: "Foundation",
    publicPriceLabel: `$${FOUNDATION_MONTHLY_USD}/mo`,
    priceLabel: `$${FOUNDATION_MONTHLY_USD}/month`,
    monthlyUsd: FOUNDATION_MONTHLY_USD,
    implementationUsd: FOUNDATION_IMPLEMENTATION_USD,
    productAllowance: FOUNDATION_PRODUCT_LIMIT,
    passportAllowance: FOUNDATION_PRODUCT_LIMIT,
    userSeats: FOUNDATION_SEAT_LIMIT,
    commitmentMonths: 6,
    headline: "Build the product data foundation.",
    features: [
      `Up to ${FOUNDATION_PRODUCT_LIMIT.toLocaleString("en-US")} managed products · ${FOUNDATION_PRODUCT_LIMIT.toLocaleString("en-US")} hosted passports · ${FOUNDATION_SEAT_LIMIT} seats`,
      "Governed product records & Digital Product Passports",
      "Basic traceability, compliance readiness & supplier evidence",
      "Material Benchmark (Basic) & standard analytics",
      "Standard file / data imports and exports",
    ],
    notIncluded: [
      "General API access & webhooks",
      "White-label consumer passport experiences",
      "Resale / circularity tooling",
      "Advanced integrations",
    ],
  },
  {
    key: "platform",
    name: "Intelligence",
    publicPriceLabel: `$${INTELLIGENCE_MONTHLY_USD.toLocaleString("en-US")}/mo`,
    priceLabel: `$${INTELLIGENCE_MONTHLY_USD.toLocaleString("en-US")}/month`,
    monthlyUsd: INTELLIGENCE_MONTHLY_USD,
    implementationUsd: INTELLIGENCE_IMPLEMENTATION_USD,
    productAllowance: INTELLIGENCE_PRODUCT_LIMIT,
    passportAllowance: INTELLIGENCE_PRODUCT_LIMIT,
    userSeats: INTELLIGENCE_SEAT_LIMIT,
    commitmentMonths: 6,
    headline: "Turn product data into actionable intelligence.",
    features: [
      "Everything in Foundation",
      `Up to ${INTELLIGENCE_PRODUCT_LIMIT.toLocaleString("en-US")} managed products · ${INTELLIGENCE_PRODUCT_LIMIT.toLocaleString("en-US")} hosted passports · ${INTELLIGENCE_SEAT_LIMIT} seats`,
      "White-label passports · standard API & webhooks",
      "Circularity / resale · advanced analytics & scorecards",
      "Advanced integrations",
    ],
    notIncluded: ["Headless passport API (Enterprise)", "SSO & custom domains", "Custom SLA & multi-brand deployments"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    publicPriceLabel: "Custom",
    priceLabel: "Custom",
    monthlyUsd: null,
    implementationUsd: null,
    productAllowance: null,
    passportAllowance: null,
    userSeats: null,
    commitmentMonths: 11,
    headline: "Infrastructure for complex product ecosystems.",
    features: [
      "Custom product & passport volume",
      "Everything in Intelligence",
      "Headless passport API · custom domains · SSO",
      "Custom PLM / PIM / ERP integrations",
      "Multi-brand deployments · custom SLA",
    ],
    notIncluded: [],
  },
];

/** Year-1 $600K ARR planning mix (~58 customers, not hundreds). */
export const SAAS_ARR_600K_MODEL = {
  targetArrUsd: 600_000,
  targetMrrUsd: 50_000,
  mix: [
    { tier: "professional" as const, customers: 30, monthlyUsd: FOUNDATION_MONTHLY_USD },
    { tier: "platform" as const, customers: 28, monthlyUsd: INTELLIGENCE_MONTHLY_USD },
  ],
  totalCustomers: 58,
  note: "Implementation fees, enterprise contracts, API fees, and hosting overages sit on top of SaaS ARR.",
};

export function formatTierPrice(monthlyUsd: number | null): string {
  if (monthlyUsd == null) return "Custom";
  return `$${monthlyUsd.toLocaleString("en-US")}/month`;
}

/** Public-facing price copy. */
export function publicTierPriceLabel(tier: SaasTierKey): string {
  return saasTierByKey(tier).publicPriceLabel;
}

export function planDisplayName(plan: string): string {
  switch (plan) {
    case "demo":
    case "free_snapshot":
      return "10-product pilot";
    case "founding_pilot":
      return ONBOARDING_FEE_LABEL;
    case "professional":
    case "saas":
      return "Foundation";
    case "platform":
      return "Intelligence";
    case "enterprise":
      return "Enterprise";
    case "internal":
      return "Internal";
    default:
      return plan.replaceAll("_", " ");
  }
}

export function upgradeHintForPlan(plan: string): string {
  if (plan === "demo" || plan === "free_snapshot") {
    return "After your 10-product pilot, choose Foundation, Intelligence, or Enterprise.";
  }
  if (plan === "founding_pilot") {
    return "Implementation complete? Subscribe to Foundation or Intelligence — Enterprise for headless API, custom volume, and SLAs.";
  }
  if (plan === "professional" || plan === "saas") {
    return "Need white-label passports, circularity, API access, or higher catalog limits? Upgrade to Intelligence. Headless API requires Enterprise.";
  }
  if (plan === "platform") {
    return "Headless passport API, SSO, custom domains, and custom compliance require Enterprise.";
  }
  return "Contact INTERTEXE to adjust your plan or hosting volume.";
}

export function saasTierByKey(key: SaasTierKey): SaasTierDefinition {
  const tier = SAAS_TIERS.find((t) => t.key === key);
  if (!tier) throw new Error(`Unknown SaaS tier: ${key}`);
  return tier;
}
