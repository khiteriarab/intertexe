import { normalizePlanKey, planDefinition, planHasFeature, planLimit, type PlanFeature } from "./plans";
import { saasTierByKey, type SaasTierKey } from "./pricing";

export type PlanKey =
  | "demo"
  | "free_snapshot"
  | "founding_pilot"
  | "platform"
  | "professional"
  | "enterprise"
  /** @deprecated Use `professional` — kept for existing org rows */
  | "saas"
  | "internal";

export type EntitlementSnapshot = {
  plan: PlanKey;
  productAllowance: number | null;
  passportAllowance: number | null;
  canPublishPassports: boolean;
  canUseSuppliers: boolean;
  canUseApi: boolean;
  canUseHeadlessApi: boolean;
  canWhiteLabel: boolean;
  canCustomDomain: boolean;
  canUseSso: boolean;
  canBenchmark: boolean;
  canExportUnlimited: boolean;
  canUseIntegrations: boolean;
  canUseRegulatoryProgram: boolean;
  canAdvancedAnalytics: boolean;
  canPrioritySupport: boolean;
  canCustomCarriers: boolean;
  canUseCircularity: boolean;
};

function fromPlanDefinition(
  plan: PlanKey,
  overrides?: { productAllowance?: number | null; passportAllowance?: number | null }
): EntitlementSnapshot {
  const def = planDefinition(plan);
  return {
    plan,
    productAllowance: overrides?.productAllowance ?? def.maxProducts,
    passportAllowance: overrides?.passportAllowance ?? def.maxHostedPassports,
    canPublishPassports: def.features.has("publish_passports"),
    canUseSuppliers: def.features.has("suppliers"),
    canUseApi: def.features.has("api_access") || def.features.has("headless_api"),
    canUseHeadlessApi: def.features.has("headless_api"),
    canWhiteLabel: def.features.has("white_label"),
    canCustomDomain: def.features.has("custom_domain"),
    canUseSso: def.features.has("sso"),
    canBenchmark: def.features.has("advanced_benchmarking"),
    canExportUnlimited: def.features.has("export_unlimited"),
    canUseIntegrations: def.features.has("advanced_integrations"),
    canUseRegulatoryProgram: def.features.has("regulatory_program"),
    canAdvancedAnalytics: def.features.has("advanced_analytics"),
    canPrioritySupport: def.features.has("priority_support"),
    canCustomCarriers: def.features.has("custom_carriers"),
    canUseCircularity: def.features.has("circularity"),
  };
}

export function entitlementsForPlan(
  plan: PlanKey,
  overrides?: {
    productAllowance?: number | null;
    passportAllowance?: number | null;
  }
): EntitlementSnapshot {
  const normalized = normalizePlanKey(plan) as PlanKey;
  return fromPlanDefinition(normalized, overrides);
}

/** Alias for spec naming — same as entitlementsForPlan with org overrides. */
export function getOrganizationEntitlements(input: {
  plan: PlanKey | string;
  productAllowance?: number | null;
  passportAllowance?: number | null;
}): EntitlementSnapshot {
  return entitlementsForPlan(normalizePlanKey(String(input.plan)) as PlanKey, {
    productAllowance: input.productAllowance,
    passportAllowance: input.passportAllowance,
  });
}

export function organizationCan(
  entitlements: EntitlementSnapshot,
  feature: PlanFeature | keyof EntitlementSnapshot
): boolean {
  if (feature === "api_access") return entitlements.canUseApi;
  if (feature === "headless_api") return entitlements.canUseHeadlessApi;
  if (feature === "white_label") return entitlements.canWhiteLabel;
  if (feature === "custom_domain") return entitlements.canCustomDomain;
  if (feature === "sso") return entitlements.canUseSso;
  if (feature === "advanced_integrations") return entitlements.canUseIntegrations;
  if (feature === "priority_support") return entitlements.canPrioritySupport;
  if (feature === "custom_carriers") return entitlements.canCustomCarriers;
  if (feature === "advanced_analytics") return entitlements.canAdvancedAnalytics;
  if (feature === "advanced_benchmarking") return entitlements.canBenchmark;
  if (feature === "publish_passports") return entitlements.canPublishPassports;
  if (feature === "suppliers") return entitlements.canUseSuppliers;
  if (feature === "regulatory_program") return entitlements.canUseRegulatoryProgram;
  if (feature === "export_unlimited") return entitlements.canExportUnlimited;
  if (feature === "circularity") return entitlements.canUseCircularity;
  const key = feature as keyof EntitlementSnapshot;
  const val = entitlements[key];
  return typeof val === "boolean" ? val : false;
}

export function organizationLimit(
  entitlements: EntitlementSnapshot,
  resource: "products" | "hosted_passports" | "team_members"
): number | null {
  if (resource === "products") return entitlements.productAllowance;
  if (resource === "hosted_passports") return entitlements.passportAllowance;
  return planLimit(entitlements.plan, "team_members");
}

export function checkUsageAllowance(
  entitlements: EntitlementSnapshot,
  resource: "products" | "hosted_passports",
  currentCount: number,
  additional = 1
): { allowed: boolean; remaining: number | null; overLimit: boolean } {
  const limit = organizationLimit(entitlements, resource);
  if (limit == null) return { allowed: true, remaining: null, overLimit: false };
  const overLimit = currentCount > limit;
  const remaining = limit - currentCount;
  const allowed = !overLimit && remaining >= additional;
  return { allowed, remaining, overLimit };
}

export function canAddProducts(entitlement: EntitlementSnapshot, currentCount: number): boolean {
  return checkUsageAllowance(entitlement, "products", currentCount, 1).allowed;
}

export function canPublishNewPassport(
  entitlement: EntitlementSnapshot,
  publishedIdentityCount: number,
  isRepublish: boolean
): boolean {
  if (!entitlement.canPublishPassports) return false;
  if (isRepublish) return true;
  return checkUsageAllowance(entitlement, "hosted_passports", publishedIdentityCount, 1).allowed;
}

/** @deprecated internal tier helper — prefer planDefinition */
export function tierEntitlementsFromSaas(tier: SaasTierKey): EntitlementSnapshot {
  const def = saasTierByKey(tier);
  return entitlementsForPlan(tier, {
    productAllowance: def.productAllowance,
    passportAllowance: def.passportAllowance,
  });
}

export { planHasFeature, planLimit, normalizePlanKey };
