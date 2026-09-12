/**
 * INTERTEXE commercial model — onboarding fee + three SaaS tiers.
 * Brands pay for product intelligence and identity infrastructure, not dashboard access alone.
 */

export const FOUNDING_PILOT_PRICE_USD = 5_000;
export const PLATFORM_MONTHLY_USD = 499;
export const PROFESSIONAL_MONTHLY_USD = 1_250;

export type SaasTierKey = "platform" | "professional" | "enterprise";

export type SaasTierDefinition = {
  key: SaasTierKey;
  name: string;
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
    key: "platform",
    name: "Platform",
    priceLabel: "$499/month",
    monthlyUsd: PLATFORM_MONTHLY_USD,
    productAllowance: 500,
    passportAllowance: 50,
    userSeats: 3,
    headline: "Core enterprise operating system for governed product records.",
    features: [
      "Governed product records & material intelligence",
      "Issues register, workflows & basic Material Benchmark",
      "DPP management, QR generation & passport publishing",
      "Up to 500 managed products · 50 active INTERTEXE-hosted passports",
      "3 workspace users",
    ],
    notIncluded: [
      "White-label consumer passport experiences",
      "Headless passport API",
      "SSO, custom domains & ERP/PLM integrations",
    ],
  },
  {
    key: "professional",
    name: "Professional",
    priceLabel: "$1,250/month",
    monthlyUsd: PROFESSIONAL_MONTHLY_USD,
    productAllowance: 2_500,
    passportAllowance: 250,
    userSeats: 10,
    headline: "Presentation and distribution layer on top of the operating system.",
    features: [
      "Everything in Platform",
      "Up to 2,500 managed products · 250 active passports",
      "White-label consumer passport experiences & branded templates",
      "Advanced analytics & 10 workspace users",
      "Resale / circularity tooling as released",
      "Enhanced export limits — not headless infrastructure API",
    ],
    notIncluded: ["Headless passport API (Enterprise)", "SSO & custom domains", "PLM/PIM/ERP integrations"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom",
    monthlyUsd: null,
    productAllowance: null,
    passportAllowance: null,
    userSeats: null,
    headline: "Infrastructure for brands powering product data inside their own apps.",
    features: [
      "Custom / high-volume product & passport hosting",
      "Headless passport API · SSO · custom domains",
      "PLM / PIM / ERP integrations & custom roles",
      "NFC / RFID carrier integrations & SLAs",
      "Dedicated implementation & deeper resale integrations",
    ],
    notIncluded: [],
  },
];

/** Year-1 $600K ARR planning mix (~58 customers, not hundreds). */
export const SAAS_ARR_600K_MODEL = {
  targetArrUsd: 600_000,
  targetMrrUsd: 50_000,
  mix: [
    { tier: "platform" as const, customers: 30, monthlyUsd: PLATFORM_MONTHLY_USD },
    { tier: "professional" as const, customers: 28, monthlyUsd: PROFESSIONAL_MONTHLY_USD },
  ],
  totalCustomers: 58,
  note: "Pilots ($5K), enterprise contracts, API fees, and hosting overages sit on top of SaaS ARR.",
};

export function formatTierPrice(monthlyUsd: number | null): string {
  if (monthlyUsd == null) return "Custom";
  return `$${monthlyUsd.toLocaleString("en-US")}/month`;
}

export function planDisplayName(plan: string): string {
  switch (plan) {
    case "free_snapshot":
      return "Free Material Snapshot";
    case "founding_pilot":
      return "Founding Pilot (onboarding)";
    case "platform":
      return "Platform";
    case "professional":
    case "saas":
      return "Professional";
    case "enterprise":
      return "Enterprise";
    case "internal":
      return "Internal";
    default:
      return plan.replaceAll("_", " ");
  }
}

export function upgradeHintForPlan(plan: string): string {
  if (plan === "free_snapshot") {
    return `Start with the $${FOUNDING_PILOT_PRICE_USD.toLocaleString("en-US")} Founding Pilot (implementation), then choose Platform ($${PLATFORM_MONTHLY_USD}/mo), Professional ($${PROFESSIONAL_MONTHLY_USD.toLocaleString("en-US")}/mo), or Enterprise.`;
  }
  if (plan === "founding_pilot") {
    return `Pilot complete? Move to Platform ($${PLATFORM_MONTHLY_USD}/mo), Professional ($${PROFESSIONAL_MONTHLY_USD.toLocaleString("en-US")}/mo), or Enterprise for headless API & integrations.`;
  }
  if (plan === "platform") {
    return "Need white-label passports or higher catalog limits? Upgrade to Professional ($1,250/mo). Headless API requires Enterprise.";
  }
  if (plan === "professional" || plan === "saas") {
    return "Headless passport API, SSO, custom domains, and ERP integrations require Enterprise.";
  }
  return "Contact INTERTEXE to adjust your plan or hosting volume.";
}

export function saasTierByKey(key: SaasTierKey): SaasTierDefinition {
  const tier = SAAS_TIERS.find((t) => t.key === key);
  if (!tier) throw new Error(`Unknown SaaS tier: ${key}`);
  return tier;
}
