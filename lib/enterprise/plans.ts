/**
 * Central plan definitions — INTERTEXE/obelisk-core is the entitlement source of truth.
 * Paddle price IDs map into these plans; never infer plan from dollar amounts.
 */

import type { PlanKey } from "./entitlements";
import {
  PILOT_PRODUCT_LIMIT,
  PLATFORM_MONTHLY_USD,
  PLATFORM_PRODUCT_LIMIT,
  PROFESSIONAL_MONTHLY_USD,
  PROFESSIONAL_PRODUCT_LIMIT,
  ONBOARDING_FEE_USD,
} from "./pricing";

export type BillingProvider = "paddle" | "manual" | null;

export type BillingStatus =
  | "none"
  | "active"
  | "past_due"
  | "grace_period"
  | "restricted"
  | "canceled"
  | "paused";

export type PlanFeature =
  | "api_access"
  | "headless_api"
  | "white_label"
  | "custom_domain"
  | "sso"
  | "advanced_integrations"
  | "priority_support"
  | "custom_carriers"
  | "advanced_analytics"
  | "advanced_benchmarking"
  | "publish_passports"
  | "suppliers"
  | "regulatory_program"
  | "export_unlimited"
  | "circularity";

export type PlanDefinition = {
  key: PlanKey;
  label: string;
  billingProvider: BillingProvider;
  maxProducts: number | null;
  maxHostedPassports: number | null;
  maxTeamMembers: number | null;
  features: ReadonlySet<PlanFeature>;
  /** Monthly USD — null for custom / pilot */
  monthlyUsd: number | null;
  /** One-time implementation USD — sold separately via Paddle when needed */
  implementationUsd: number | null;
};

const f = (...keys: PlanFeature[]) => new Set(keys);

export const PLAN_DEFINITIONS: Record<PlanKey, PlanDefinition> = {
  demo: {
    key: "demo",
    label: "10-product pilot",
    billingProvider: null,
    maxProducts: PILOT_PRODUCT_LIMIT,
    maxHostedPassports: PILOT_PRODUCT_LIMIT,
    maxTeamMembers: 3,
    monthlyUsd: 0,
    implementationUsd: null,
    features: f("publish_passports", "suppliers"),
  },
  free_snapshot: {
    key: "free_snapshot",
    label: "10-product pilot",
    billingProvider: null,
    maxProducts: PILOT_PRODUCT_LIMIT,
    maxHostedPassports: PILOT_PRODUCT_LIMIT,
    maxTeamMembers: 3,
    monthlyUsd: 0,
    implementationUsd: null,
    features: f("publish_passports", "suppliers"),
  },
  founding_pilot: {
    key: "founding_pilot",
    label: "Implementation paid",
    billingProvider: "manual",
    maxProducts: PILOT_PRODUCT_LIMIT,
    maxHostedPassports: PILOT_PRODUCT_LIMIT,
    maxTeamMembers: 5,
    monthlyUsd: null,
    implementationUsd: ONBOARDING_FEE_USD,
    features: f("publish_passports", "suppliers", "regulatory_program"),
  },
  professional: {
    key: "professional",
    label: "Professional",
    billingProvider: "paddle",
    maxProducts: PROFESSIONAL_PRODUCT_LIMIT,
    maxHostedPassports: PROFESSIONAL_PRODUCT_LIMIT,
    maxTeamMembers: 3,
    monthlyUsd: PROFESSIONAL_MONTHLY_USD,
    implementationUsd: ONBOARDING_FEE_USD,
    features: f(
      "publish_passports",
      "suppliers",
      "advanced_benchmarking",
      "regulatory_program",
      "api_access"
    ),
  },
  platform: {
    key: "platform",
    label: "Platform",
    billingProvider: "paddle",
    maxProducts: PLATFORM_PRODUCT_LIMIT,
    maxHostedPassports: PLATFORM_PRODUCT_LIMIT,
    maxTeamMembers: 10,
    monthlyUsd: PLATFORM_MONTHLY_USD,
    implementationUsd: ONBOARDING_FEE_USD,
    features: f(
      "publish_passports",
      "suppliers",
      "api_access",
      "white_label",
      "advanced_analytics",
      "advanced_benchmarking",
      "priority_support",
      "regulatory_program",
      "export_unlimited",
      "advanced_integrations",
      "circularity"
    ),
  },
  saas: {
    key: "saas",
    label: "Professional",
    billingProvider: "paddle",
    maxProducts: PROFESSIONAL_PRODUCT_LIMIT,
    maxHostedPassports: PROFESSIONAL_PRODUCT_LIMIT,
    maxTeamMembers: 3,
    monthlyUsd: PROFESSIONAL_MONTHLY_USD,
    implementationUsd: ONBOARDING_FEE_USD,
    features: f(
      "publish_passports",
      "suppliers",
      "advanced_benchmarking",
      "regulatory_program",
      "api_access"
    ),
  },
  enterprise: {
    key: "enterprise",
    label: "Enterprise",
    billingProvider: "manual",
    maxProducts: null,
    maxHostedPassports: null,
    maxTeamMembers: null,
    monthlyUsd: null,
    implementationUsd: null,
    features: f(
      "publish_passports",
      "suppliers",
      "api_access",
      "headless_api",
      "white_label",
      "custom_domain",
      "sso",
      "advanced_integrations",
      "priority_support",
      "custom_carriers",
      "advanced_analytics",
      "advanced_benchmarking",
      "regulatory_program",
      "export_unlimited",
      "circularity"
    ),
  },
  internal: {
    key: "internal",
    label: "Internal",
    billingProvider: null,
    maxProducts: null,
    maxHostedPassports: null,
    maxTeamMembers: null,
    monthlyUsd: null,
    implementationUsd: null,
    features: f(
      "publish_passports",
      "suppliers",
      "api_access",
      "headless_api",
      "white_label",
      "custom_domain",
      "sso",
      "advanced_integrations",
      "priority_support",
      "custom_carriers",
      "advanced_analytics",
      "advanced_benchmarking",
      "regulatory_program",
      "export_unlimited",
      "circularity"
    ),
  },
};

/** Normalize legacy plan keys to canonical definition key. */
export function normalizePlanKey(plan: string): PlanKey {
  if (plan === "saas") return "professional";
  if (plan === "free_snapshot") return "demo";
  if (plan in PLAN_DEFINITIONS) return plan as PlanKey;
  return "demo";
}

export function planDefinition(plan: string): PlanDefinition {
  return PLAN_DEFINITIONS[normalizePlanKey(plan)];
}

export function planHasFeature(plan: string, feature: PlanFeature): boolean {
  return planDefinition(plan).features.has(feature);
}

export function planLimit(plan: string, resource: "products" | "hosted_passports" | "team_members"): number | null {
  const def = planDefinition(plan);
  if (resource === "products") return def.maxProducts;
  if (resource === "hosted_passports") return def.maxHostedPassports;
  return def.maxTeamMembers;
}

/** Default grace period after past_due before restricted state (days). */
export function billingGracePeriodDays(): number {
  const raw = Number(process.env.PADDLE_GRACE_PERIOD_DAYS || "14");
  return Number.isFinite(raw) && raw > 0 ? raw : 14;
}
