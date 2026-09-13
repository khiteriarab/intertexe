/**
 * INTERTEXE commercial model — 10-product pilot + three SaaS tiers.
 * Internal USD amounts are for sales/checkout only — not shown on the public marketing site.
 */

/** Free sales pilot — exactly 10 products, not a subscription tier. */
export const PILOT_PRODUCT_LIMIT = 10;

/** Managed product / passport limits — single source of truth for entitlements & UI. */
export const PROFESSIONAL_PRODUCT_LIMIT = 500;
export const PLATFORM_PRODUCT_LIMIT = 2_000;

/** Internal monthly USD — revealed after qualification, proposal, or checkout only. */
export const PROFESSIONAL_MONTHLY_USD = 499;
export const PLATFORM_MONTHLY_USD = 1_250;

/** Default one-time implementation fee — override via INTERTEXE_IMPLEMENTATION_FEE_USD. */
export const ONBOARDING_FEE_USD_DEFAULT = 5_000;

/** Resolved implementation fee (env-configurable, not hard-coded in UI). */
export function resolveOnboardingFeeUsd(): number {
  const raw = process.env.INTERTEXE_IMPLEMENTATION_FEE_USD || process.env.ONBOARDING_FEE_USD;
  const parsed = raw ? Number.parseInt(String(raw), 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : ONBOARDING_FEE_USD_DEFAULT;
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

export type SaasTierDefinition = {
  key: SaasTierKey;
  name: string;
  /** Public marketing label — no dollar amounts on the website. */
  publicPriceLabel: string;
  /** Internal checkout / sales label — includes USD when set. */
  priceLabel: string;
  monthlyUsd: number | null;
  productAllowance: number | null;
  passportAllowance: number | null;
  userSeats: number | null;
  headline: string;
  features: string[];
  notIncluded: string[];
};

export const SAAS_TIERS: SaasTierDefinition[] = [
  {
    key: "professional",
    name: "Professional",
    publicPriceLabel: "Request pricing",
    priceLabel: `$${PROFESSIONAL_MONTHLY_USD}/month`,
    monthlyUsd: PROFESSIONAL_MONTHLY_USD,
    productAllowance: PROFESSIONAL_PRODUCT_LIMIT,
    passportAllowance: PROFESSIONAL_PRODUCT_LIMIT,
    userSeats: 3,
    headline: "Standard DPP and product passport infrastructure for growing catalogs.",
    features: [
      "Up to 500 managed products · 500 hosted passports",
      "Material & composition data · traceability · sustainability fields",
      "DPP management, QR / NFC / RFID passport access",
      "Standard analytics dashboard & Material Benchmark",
      "Standard API access",
    ],
    notIncluded: [
      "White-label consumer passport experiences",
      "Resale / circularity tooling",
      "Advanced integrations & headless API",
    ],
  },
  {
    key: "platform",
    name: "Platform",
    publicPriceLabel: "Request pricing",
    priceLabel: `$${PLATFORM_MONTHLY_USD.toLocaleString("en-US")}/month`,
    monthlyUsd: PLATFORM_MONTHLY_USD,
    productAllowance: PLATFORM_PRODUCT_LIMIT,
    passportAllowance: PLATFORM_PRODUCT_LIMIT,
    userSeats: 10,
    headline: "Presentation, circularity, and automation on top of Professional.",
    features: [
      "Everything in Professional",
      "Up to 2,000 managed products · 2,000 hosted passports",
      "Advanced API access · white-label passport experiences",
      "Advanced sustainability & traceability analytics",
      "Resale / circularity functionality",
      "Integrations, automation & advanced brand reporting",
    ],
    notIncluded: ["Headless passport API (Enterprise)", "SSO & custom domains", "Custom SLA & multi-brand deployments"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    publicPriceLabel: "Contact sales",
    priceLabel: "Custom",
    monthlyUsd: null,
    productAllowance: null,
    passportAllowance: null,
    userSeats: null,
    headline: "Custom volume, compliance, and infrastructure for multi-brand deployments.",
    features: [
      "Custom product & passport volume",
      "Everything in Platform",
      "Custom API volume · headless passport API",
      "Custom integrations · SSO · custom domains",
      "Enterprise / multi-brand deployments",
      "Custom compliance / DPP requirements · SLA & migration",
    ],
    notIncluded: [],
  },
];

/** Year-1 $600K ARR planning mix (~58 customers, not hundreds). */
export const SAAS_ARR_600K_MODEL = {
  targetArrUsd: 600_000,
  targetMrrUsd: 50_000,
  mix: [
    { tier: "professional" as const, customers: 30, monthlyUsd: PROFESSIONAL_MONTHLY_USD },
    { tier: "platform" as const, customers: 28, monthlyUsd: PLATFORM_MONTHLY_USD },
  ],
  totalCustomers: 58,
  note: "Implementation fees, enterprise contracts, API fees, and hosting overages sit on top of SaaS ARR.",
};

export function formatTierPrice(monthlyUsd: number | null): string {
  if (monthlyUsd == null) return "Custom";
  return `$${monthlyUsd.toLocaleString("en-US")}/month`;
}

/** Public-facing price copy — never exposes internal USD on the marketing site. */
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
      return "Professional";
    case "platform":
      return "Platform";
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
    return "After your 10-product pilot, choose Professional, Platform, or Enterprise — pricing is shared during qualification.";
  }
  if (plan === "founding_pilot") {
    return "Implementation complete? Subscribe to Professional or Platform — Enterprise for headless API, custom volume, and SLAs.";
  }
  if (plan === "professional") {
    return "Need white-label passports, circularity, or higher catalog limits? Upgrade to Platform. Headless API requires Enterprise.";
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

